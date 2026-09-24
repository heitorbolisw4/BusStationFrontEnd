import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Header from './Header'
import { AuthContext } from '../../auth/auth-context'
import { PROFILE } from '../../test/fixtures'

// Aqui o contexto é montado à mão: o Header só lê o estado, então não
// precisa do AuthProvider de verdade (nem de API mockada).
function renderHeader(auth) {
  const value = { status: 'anonymous', user: null, logout: vi.fn(), ...auth }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <Header />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

describe('Header', () => {
  it('anônimo vê o link "Entrar" apontando para /entrar', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('logado vê o primeiro nome e o botão "Sair"', async () => {
    const auth = renderHeader({ status: 'authenticated', user: PROFILE })

    expect(screen.getByText('Olá, Maria')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
  })

  it('logado sem perfil carregado (API fora) mostra "Minha conta"', () => {
    renderHeader({ status: 'authenticated', user: null })
    expect(screen.getByText('Minha conta')).toBeInTheDocument()
  })

  it('enquanto confere o token salvo, não pisca "Entrar"', () => {
    renderHeader({ status: 'checking' })
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('links de seção apontam para a home, funcionando fora dela', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Horários' })).toHaveAttribute('href', '/#saidas')
  })
})
