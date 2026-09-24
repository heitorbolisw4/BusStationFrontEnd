import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import * as authApi from '../../api/auth'
import { ApiError } from '../../api/client'
import { readStoredRefreshToken } from '../../auth/token'
import { makePair, PROFILE } from '../../test/fixtures'
import { renderWithApp } from '../../test/renderWithApp'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
}))

const VALID = { name: 'Maria Souza', email: 'maria@example.com', password: '123456', age: '30' }

async function fillAndSubmit(user, values = VALID) {
  const fields = { name: 'Nome', email: 'E-mail', password: 'Senha', age: 'Idade' }
  for (const [key, label] of Object.entries(fields)) {
    if (values[key]) await user.type(screen.getByLabelText(label), values[key])
  }
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))
}

describe('Register', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.register).mockReset()
    vi.mocked(authApi.login).mockReset()
    vi.mocked(authApi.getProfile).mockReset()
  })

  it('cria a conta, já entra logado e volta para a página inicial', async () => {
    vi.mocked(authApi.register).mockResolvedValue(null)
    vi.mocked(authApi.login).mockResolvedValue(makePair())
    vi.mocked(authApi.getProfile).mockResolvedValue(PROFILE)
    const { user, currentPath } = renderWithApp({ route: '/cadastro' })

    await fillAndSubmit(user)

    expect(await screen.findByText('Página inicial')).toBeInTheDocument()
    expect(currentPath()).toBe('/')
    // Idade vai como número: o C# espera int.
    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Maria Souza',
      email: 'maria@example.com',
      password: '123456',
      age: 30,
    })
    expect(authApi.login).toHaveBeenCalledWith({ email: 'maria@example.com', password: '123456' })
    expect(readStoredRefreshToken()).toBe('refresh-1')
  })

  it('e-mail já cadastrado (409) aparece embaixo do campo de e-mail', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError(409, 'A User with this email already exists'),
    )
    const { user, currentPath } = renderWithApp({ route: '/cadastro' })

    await fillAndSubmit(user)

    expect(await screen.findByText('Já existe uma conta com esse e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(currentPath()).toBe('/cadastro')
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('menor de 18 é barrado no front, sem chamar a API', async () => {
    const { user } = renderWithApp({ route: '/cadastro' })

    await fillAndSubmit(user, { ...VALID, age: '17' })

    expect(screen.getByText(/pelo menos 18 anos/)).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('mostra todos os erros de validação de uma vez', async () => {
    const { user } = renderWithApp({ route: '/cadastro' })

    await fillAndSubmit(user, { name: '', email: 'sem-arroba', password: '123', age: '' })

    expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText(/pelo menos 6 caracteres/)).toBeInTheDocument()
    expect(screen.getByText('Informe sua idade.')).toBeInTheDocument()
  })

  it('outro erro da API aparece como alerta geral', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new ApiError(500, 'A API respondeu 500.'))
    const { user } = renderWithApp({ route: '/cadastro' })

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('A API respondeu 500.')
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
  })

  it('a dica de senha fica ligada ao campo para leitor de tela', () => {
    renderWithApp({ route: '/cadastro' })
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Mínimo de 6 caracteres.',
    )
  })
})
