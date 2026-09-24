import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import * as authApi from '../../api/auth'
import { ApiError } from '../../api/client'
import { storeRefreshToken } from '../../auth/token'
import { makePair, PROFILE } from '../../test/fixtures'
import { renderWithApp } from '../../test/renderWithApp'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
}))

async function fillAndSubmit(user, { email = 'maria@example.com', password = '123456' } = {}) {
  if (email) await user.type(screen.getByLabelText('E-mail'), email)
  if (password) await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.login).mockReset()
    vi.mocked(authApi.getProfile).mockReset()
  })

  it('entra e volta para a página inicial', async () => {
    vi.mocked(authApi.login).mockResolvedValue(makePair())
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
    const { user, currentPath } = renderWithApp({ route: '/entrar' })

    await fillAndSubmit(user, { email: '  maria@example.com  ' })

    expect(await screen.findByText('Página inicial')).toBeInTheDocument()
    expect(currentPath()).toBe('/')
    // E-mail vai sem os espaços que o usuário colou sem querer.
    expect(authApi.login).toHaveBeenCalledWith({ email: 'maria@example.com', password: '123456' })
  })

  it('volta para a página de origem quando veio redirecionado', async () => {
    vi.mocked(authApi.login).mockResolvedValue(makePair())
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
    const { user, currentPath } = renderWithApp({
      route: '/entrar',
      state: { from: '/minhas-passagens' },
    })

    await fillAndSubmit(user)

    expect(await screen.findByText('Minhas passagens')).toBeInTheDocument()
    expect(currentPath()).toBe('/minhas-passagens')
  })

  it('401 vira "E-mail ou senha incorretos" e o usuário continua na tela', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'A API respondeu 401.'))
    const { user, currentPath } = renderWithApp({ route: '/entrar' })

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(currentPath()).toBe('/entrar')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('erro de rede mostra a mensagem do client', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(0, 'Não foi possível falar com a API. Ela está rodando?'),
    )
    const { user } = renderWithApp({ route: '/entrar' })

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível falar com a API/)
  })

  it('valida campos vazios sem chamar a API', async () => {
    const { user } = renderWithApp({ route: '/entrar' })

    await fillAndSubmit(user, { email: '', password: '' })

    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('desabilita o botão enquanto envia (sem login duplo)', async () => {
    vi.mocked(authApi.login).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithApp({ route: '/entrar' })

    await fillAndSubmit(user)

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
    expect(authApi.login).toHaveBeenCalledTimes(1)
  })

  it('quem já está logado é mandado embora de /entrar', async () => {
    storeRefreshToken('refresh-0')
    vi.mocked(authApi.refresh).mockResolvedValue(makePair())
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
    const { currentPath } = renderWithApp({ route: '/entrar' })

    expect(await screen.findByText('Página inicial')).toBeInTheDocument()
    expect(currentPath()).toBe('/')
  })

  // Critério 4 do FEAT-025: 401 → login com mensagem.
  it('explica quando a sessão expirou', async () => {
    // Refresh token vencido/revogado: a API recusa o /refresh.
    storeRefreshToken('refresh-velho')
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiError(401, ''))
    renderWithApp({ route: '/entrar' })

    expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument()
  })

  it('o link de cadastro leva para /cadastro', async () => {
    const { user, currentPath } = renderWithApp({ route: '/entrar' })

    await user.click(screen.getByRole('link', { name: 'Criar conta' }))

    expect(currentPath()).toBe('/cadastro')
  })
})
