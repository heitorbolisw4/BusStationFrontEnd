// eslint-disable react/only-export-components -- helper de teste, não passa por Fast Refresh
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import AuthProvider from '../auth/AuthProvider'
import Login from '../pages/Auth/Login'
import Register from '../pages/Auth/Register'

// Mostra a URL atual na tela, para o teste conferir redirecionamentos
// sem depender de detalhe interno do roteador.
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

// MemoryRouter: roteador que guarda a URL em memória, sem barra de
// endereço — é o jeito de testar navegação fora do navegador.
// O AuthProvider é o de verdade; quem vira dublê é o módulo api/auth.
export function renderWithApp({ route = '/', state } = {}) {
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={[{ pathname: route, state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>Página inicial</p>} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/minhas-passagens" element={<p>Minhas passagens</p>} />
        </Routes>
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  )

  return { user, currentPath: () => screen.getByTestId('location').textContent }
}
