import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthProvider from './AuthProvider'
import { useAuth } from './auth-context'
import { readStoredRefreshToken, storeRefreshToken } from './token'
import * as authApi from '../api/auth'
import { ApiError } from '../api/client'
import { makePair, PROFILE } from '../test/fixtures'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
}))

const unauthorized = () => new ApiError(401, 'A API respondeu 401.')

// Promise que o teste resolve quando quiser (simula API lenta).
function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// Componente de teste: expõe o estado do contexto em texto e as ações
// em botões. `call` é uma "rota protegida" falsa, trocada por teste.
// O resultado das requisições fica em Probe.results para o teste esperar.
function Probe({ call }) {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.name ?? '-'}</p>
      <p data-testid="expired">{String(auth.sessionExpired)}</p>
      <button onClick={() => auth.login({ email: 'maria@example.com', password: '123456' })}>
        login
      </button>
      <button onClick={auth.logout}>logout</button>
      <button
        onClick={() => {
          // Duas requisições autenticadas disparadas no mesmo instante.
          Probe.results = Promise.allSettled([auth.request(call), auth.request(call)])
        }}
      >
        duas requisições
      </button>
      <button onClick={() => (Probe.results = Promise.allSettled([auth.request(call)]))}>
        uma requisição
      </button>
    </div>
  )
}

const text = (id) => screen.getByTestId(id).textContent

// Faz login pela UI e deixa o Provider com o token de acesso "access-1".
async function renderLoggedIn(call) {
  vi.mocked(authApi.login).mockResolvedValue(makePair(1))
  vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <Probe call={call} />
    </AuthProvider>,
  )
  await user.click(screen.getByText('login'))
  await screen.findByText('Maria Souza')
  return user
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    for (const fn of Object.values(authApi)) vi.mocked(fn).mockReset()
    vi.mocked(authApi.logout).mockResolvedValue(null)
    Probe.results = null
  })

  describe('início da sessão', () => {
    it('sem refresh token salvo, começa anônimo e não chama a API', () => {
      render(<AuthProvider><Probe /></AuthProvider>)

      expect(text('status')).toBe('anonymous')
      expect(authApi.refresh).not.toHaveBeenCalled()
    })

    it('com refresh token salvo, troca por um par novo e carrega o perfil', async () => {
      storeRefreshToken('refresh-0')
      vi.mocked(authApi.refresh).mockResolvedValue(makePair(1))
      vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)

      render(<AuthProvider><Probe /></AuthProvider>)

      expect(text('status')).toBe('checking')
      expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
      expect(authApi.refresh).toHaveBeenCalledWith('refresh-0')
      expect(authApi.getProfile).toHaveBeenCalledWith('access-1')
      // Rotação: o refresh token guardado agora é o novo.
      expect(readStoredRefreshToken()).toBe('refresh-1')
    })

    it('refresh token salvo mas recusado (401) → anônimo, com aviso de sessão expirada', async () => {
      storeRefreshToken('refresh-velho')
      vi.mocked(authApi.refresh).mockRejectedValue(unauthorized())

      render(<AuthProvider><Probe /></AuthProvider>)

      await vi.waitFor(() => expect(text('status')).toBe('anonymous'))
      expect(text('expired')).toBe('true')
      expect(readStoredRefreshToken()).toBeNull()
    })

    it('API fora do ar ao abrir o site: fica deslogado, mas guarda o refresh token', async () => {
      storeRefreshToken('refresh-0')
      vi.mocked(authApi.refresh).mockRejectedValue(new ApiError(0, 'fora do ar'))

      render(<AuthProvider><Probe /></AuthProvider>)

      await vi.waitFor(() => expect(text('status')).toBe('anonymous'))
      expect(text('expired')).toBe('false')
      expect(readStoredRefreshToken()).toBe('refresh-0')
    })
  })

  describe('login e logout', () => {
    it('login guarda o refresh token e carrega o perfil', async () => {
      await renderLoggedIn()

      expect(text('status')).toBe('authenticated')
      expect(readStoredRefreshToken()).toBe('refresh-1')
      expect(authApi.getProfile).toHaveBeenCalledWith('access-1')
    })

    it('funciona com a API antiga, que devolve só { token }', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ token: 'access-antigo' })
      vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
      const user = userEvent.setup()
      render(<AuthProvider><Probe /></AuthProvider>)

      await user.click(screen.getByText('login'))

      expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
      expect(readStoredRefreshToken()).toBeNull()
    })

    it('logout limpa a sessão e avisa a API com o refresh token', async () => {
      const user = await renderLoggedIn()

      await user.click(screen.getByText('logout'))

      expect(text('status')).toBe('anonymous')
      expect(text('expired')).toBe('false') // saiu por vontade própria
      expect(readStoredRefreshToken()).toBeNull()
      expect(authApi.logout).toHaveBeenCalledWith('refresh-1')
    })
  })

  describe('request() — chamadas autenticadas', () => {
    it('manda o token de acesso atual para a chamada', async () => {
      const call = vi.fn().mockResolvedValue('ok')
      const user = await renderLoggedIn(call)

      await user.click(screen.getByText('uma requisição'))

      const [result] = await Probe.results
      expect(result).toEqual({ status: 'fulfilled', value: 'ok' })
      expect(call).toHaveBeenCalledWith('access-1')
      expect(authApi.refresh).not.toHaveBeenCalled()
    })

    // Critério do FEAT-025: refresh com sucesso → retry.
    it('401 → faz refresh e repete a chamada com o token novo', async () => {
      const call = vi.fn((token) =>
        token === 'access-2' ? Promise.resolve('ok') : Promise.reject(unauthorized()),
      )
      vi.mocked(authApi.refresh).mockResolvedValue(makePair(2))
      const user = await renderLoggedIn(call)

      await user.click(screen.getByText('uma requisição'))

      const [result] = await Probe.results
      expect(result).toEqual({ status: 'fulfilled', value: 'ok' })
      expect(authApi.refresh).toHaveBeenCalledWith('refresh-1')
      expect(call.mock.calls.map(([t]) => t)).toEqual(['access-1', 'access-2'])
      expect(readStoredRefreshToken()).toBe('refresh-2')
      expect(text('status')).toBe('authenticated')
    })

    // Critério do FEAT-025: refresh falhando → login com mensagem.
    it('401 e refresh recusado → encerra a sessão como expirada', async () => {
      const call = vi.fn().mockRejectedValue(unauthorized())
      vi.mocked(authApi.refresh).mockRejectedValue(unauthorized())
      const user = await renderLoggedIn(call)

      await user.click(screen.getByText('uma requisição'))

      const [result] = await Probe.results
      expect(result.status).toBe('rejected')
      expect(result.reason.message).toMatch(/Sua sessão expirou/)
      await vi.waitFor(() => expect(text('status')).toBe('anonymous'))
      expect(text('expired')).toBe('true')
      expect(readStoredRefreshToken()).toBeNull()
    })

    // Critério do FEAT-025: dois 401 simultâneos → um único /refresh.
    // Dois /refresh com o mesmo token fariam a API revogar TODAS as sessões.
    it('duas chamadas com 401 ao mesmo tempo disparam UM refresh só', async () => {
      const refresh = deferred()
      vi.mocked(authApi.refresh).mockReturnValue(refresh.promise)
      const call = vi.fn((token) =>
        token === 'access-2' ? Promise.resolve(`ok ${token}`) : Promise.reject(unauthorized()),
      )
      const user = await renderLoggedIn(call)

      await user.click(screen.getByText('duas requisições'))
      // Deixa as duas chegarem ao 401 e ficarem esperando o refresh.
      await vi.waitFor(() => expect(authApi.refresh).toHaveBeenCalled())
      refresh.resolve(makePair(2))

      const results = await Probe.results
      expect(results.map((r) => r.value)).toEqual(['ok access-2', 'ok access-2'])
      expect(authApi.refresh).toHaveBeenCalledTimes(1)
    })

    it('erro que não é 401 passa direto, sem refresh', async () => {
      const call = vi.fn().mockRejectedValue(new ApiError(400, 'Dont have seats'))
      const user = await renderLoggedIn(call)

      await user.click(screen.getByText('uma requisição'))

      const [result] = await Probe.results
      expect(result.reason.message).toBe('Dont have seats')
      expect(authApi.refresh).not.toHaveBeenCalled()
      expect(text('status')).toBe('authenticated')
    })
  })

  describe('refresh entre abas e em StrictMode', () => {
    // jsdom não tem Web Locks: esta trava falsa enfileira quem chama, como
    // o navegador faz entre abas (FIFO, um de cada vez).
    function installFakeLocks() {
      let tail = Promise.resolve()
      const request = vi.fn((_name, fn) => {
        const run = tail.then(() => fn())
        tail = run.catch(() => {})
        return run
      })
      Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
      return request
    }

    // Refresh "lento" (um tick) que rotaciona: refresh-N → par N+1.
    function rotatingRefresh() {
      vi.mocked(authApi.refresh).mockImplementation(async (refreshToken) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        const n = Number(refreshToken.split('-')[1])
        return makePair(n + 1)
      })
    }

    afterEach(() => {
      delete navigator.locks
    })

    it('duas abas abrindo juntas nunca reusam o mesmo refresh token', async () => {
      const lock = installFakeLocks()
      storeRefreshToken('refresh-0')
      rotatingRefresh()
      vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)

      // Duas "abas": dois Providers independentes, mesmo localStorage.
      render(
        <>
          <AuthProvider><Probe /></AuthProvider>
          <AuthProvider><Probe /></AuthProvider>
        </>,
      )

      await vi.waitFor(() =>
        expect(screen.getAllByTestId('status').map((el) => el.textContent)).toEqual([
          'authenticated',
          'authenticated',
        ]),
      )
      // A 2ª aba esperou a trava e leu o token que a 1ª gravou. Cada aba
      // precisa do próprio token de ACESSO (ele fica só em memória), por
      // isso são dois /refresh — mas nenhum refresh token é usado 2 vezes.
      const used = vi.mocked(authApi.refresh).mock.calls.map(([t]) => t)
      expect(used).toEqual(['refresh-0', 'refresh-1'])
      expect(new Set(used).size).toBe(used.length)
      expect(lock).toHaveBeenCalledWith('busstation-refresh', expect.any(Function))
      expect(readStoredRefreshToken()).toBe('refresh-2')
    })

    it('em StrictMode (efeito rodando 2x), o boot faz um /refresh só', async () => {
      storeRefreshToken('refresh-0')
      rotatingRefresh()
      vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)

      render(
        <StrictMode>
          <AuthProvider><Probe /></AuthProvider>
        </StrictMode>,
      )

      expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
      expect(authApi.refresh).toHaveBeenCalledTimes(1)
    })
  })

  it('useAuth fora do Provider falha com mensagem clara', () => {
    // O React loga o erro no console antes de relançar; silenciamos só aqui.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/dentro de <AuthProvider>/)
    spy.mockRestore()
  })
})
