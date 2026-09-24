import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthProvider from './AuthProvider'
import { useAuth } from './auth-context'
import { readStoredToken, storeToken } from './token'
import * as authApi from '../api/auth'
import { ApiError } from '../api/client'
import { makeToken, PROFILE } from '../test/fixtures'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getProfile: vi.fn(),
}))

// Componente de teste: expõe o estado do contexto em texto e as ações
// em botões — o teste interage com ele como um usuário faria.
function Probe() {
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
    </div>
  )
}

const text = (id) => screen.getByTestId(id).textContent

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.login).mockReset()
    vi.mocked(authApi.getProfile).mockReset()
    vi.mocked(authApi.register).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sem token salvo, começa anônimo e não chama a API', () => {
    render(<AuthProvider><Probe /></AuthProvider>)

    expect(text('status')).toBe('anonymous')
    expect(authApi.getProfile).not.toHaveBeenCalled()
  })

  it('com token válido salvo, restaura a sessão buscando o perfil', async () => {
    const token = makeToken()
    storeToken(token)
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(text('status')).toBe('checking')
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
    expect(text('status')).toBe('authenticated')
    expect(authApi.getProfile).toHaveBeenCalledWith(token)
  })

  it('token salvo já vencido é descartado sem ir à API', () => {
    storeToken(makeToken({ expiresInSeconds: -1 }))

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(text('status')).toBe('anonymous')
    expect(readStoredToken()).toBeNull()
    expect(authApi.getProfile).not.toHaveBeenCalled()
  })

  it('se a API recusar o token salvo (401), encerra a sessão como expirada', async () => {
    storeToken(makeToken())
    vi.mocked(authApi.getProfile).mockRejectedValue(new ApiError(401, 'A API respondeu 401.'))

    render(<AuthProvider><Probe /></AuthProvider>)

    await vi.waitFor(() => expect(text('status')).toBe('anonymous'))
    expect(text('expired')).toBe('true')
    expect(readStoredToken()).toBeNull()
  })

  it('se a API estiver fora do ar, mantém a sessão (o token ainda vale)', async () => {
    const token = makeToken()
    storeToken(token)
    vi.mocked(authApi.getProfile).mockRejectedValue(new ApiError(0, 'fora do ar'))

    render(<AuthProvider><Probe /></AuthProvider>)

    await vi.waitFor(() => expect(text('status')).toBe('authenticated'))
    expect(text('user')).toBe('-')
    expect(readStoredToken()).toBe(token)
  })

  it('login guarda o token e carrega o perfil; logout apaga tudo', async () => {
    const token = makeToken()
    vi.mocked(authApi.login).mockResolvedValue(token)
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
    const user = userEvent.setup()
    render(<AuthProvider><Probe /></AuthProvider>)

    await user.click(screen.getByText('login'))

    expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
    expect(readStoredToken()).toBe(token)

    await user.click(screen.getByText('logout'))

    expect(text('status')).toBe('anonymous')
    expect(text('expired')).toBe('false') // saiu por vontade própria
    expect(readStoredToken()).toBeNull()
  })

  // A API emite token de 5 minutos, sem tolerância de relógio.
  it('encerra a sessão sozinho no instante em que o token vence', async () => {
    vi.useFakeTimers()
    const token = makeToken({ expiresInSeconds: 300 })
    storeToken(token)
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)

    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => {}) // deixa o perfil carregar
    expect(text('status')).toBe('authenticated')

    act(() => vi.advanceTimersByTime(299_000))
    expect(text('status')).toBe('authenticated')

    act(() => vi.advanceTimersByTime(1_000))
    expect(text('status')).toBe('anonymous')
    expect(text('expired')).toBe('true')
    expect(readStoredToken()).toBeNull()
  })

  it('useAuth fora do Provider falha com mensagem clara', () => {
    // O React loga o erro no console antes de relançar; silenciamos só aqui.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/dentro de <AuthProvider>/)
    vi.restoreAllMocks()
  })
})
