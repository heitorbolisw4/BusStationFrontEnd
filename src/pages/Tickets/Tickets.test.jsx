import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import Tickets from './Tickets'
import { listTickets } from '../../api/tickets'
import { ApiError } from '../../api/client'
import { AuthContext } from '../../auth/auth-context'

vi.mock('../../api/tickets', () => ({ listTickets: vi.fn() }))

function LoginProbe() {
  const location = useLocation()
  return <p data-testid="login">{JSON.stringify(location.state)}</p>
}

function renderTickets(auth = {}) {
  const value = {
    status: 'authenticated',
    request: vi.fn((call) => call('access-1')),
    ...auth,
  }
  render(
    <MemoryRouter initialEntries={['/minhas-passagens']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/minhas-passagens" element={<Tickets />} />
          <Route path="/entrar" element={<LoginProbe />} />
          <Route path="/" element={<p>Página inicial</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

// Mesmo formato do TicketResponse da API.
function makeTicket(overrides) {
  return {
    id: 1,
    boardingId: 10,
    routeId: 3,
    routeName: 'Uberlândia → Uberaba',
    boardingDate: '2026-10-01',
    boardingTime: '05:40:00',
    farePaid: 44.1,
    purchasedOn: '2026-09-20T12:00:00Z',
    ...overrides,
  }
}

describe('Tickets (minhas passagens)', () => {
  beforeEach(() => {
    listTickets.mockReset()
    // "Agora" fixo: 24/09/2026 às 22:30 (Brasília). Só Date é falsificado
    // para o userEvent continuar funcionando.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 24, 22, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Critério 3 do FEAT-025.
  it('lista as passagens separando próximas e anteriores, na ordem certa', async () => {
    listTickets.mockResolvedValue([
      makeTicket({ id: 1, boardingDate: '2026-09-20', routeName: 'Passada antiga' }),
      makeTicket({ id: 2, boardingDate: '2026-10-05', routeName: 'Futura distante' }),
      makeTicket({ id: 3, boardingDate: '2026-09-24', boardingTime: '23:00:00', routeName: 'Hoje mais tarde' }),
      makeTicket({ id: 4, boardingDate: '2026-09-24', boardingTime: '06:00:00', routeName: 'Hoje cedo' }),
    ])
    const auth = renderTickets()

    const upcoming = await screen.findByRole('region', { name: 'Próximas viagens' })
    const past = screen.getByRole('region', { name: 'Viagens anteriores' })

    // Próximas: a mais perto primeiro. Anteriores: a mais recente primeiro.
    const names = (region) =>
      within(region).getAllByRole('listitem').map((li) => li.querySelector('span').textContent)
    expect(names(upcoming)).toEqual(['Hoje mais tarde', 'Futura distante'])
    expect(names(past)).toEqual(['Hoje cedo', 'Passada antiga'])
    expect(auth.request).toHaveBeenCalledWith(listTickets)
  })

  it('mostra hora, data em português, número e valor pago', async () => {
    listTickets.mockResolvedValue([makeTicket({ id: 42 })])
    renderTickets()

    const card = (await screen.findAllByRole('listitem'))[0]
    expect(within(card).getByText('05:40')).toBeInTheDocument()
    // Data montada no fuso local: "2026-10-01" não pode virar 30/09.
    expect(within(card).getByText(/1 de out/)).toBeInTheDocument()
    expect(within(card).getByText('Passagem nº 42')).toBeInTheDocument()
    expect(within(card).getByText(/^R\$\s44,10$/)).toBeInTheDocument()
  })

  it('sem passagens, convida a buscar horários', async () => {
    listTickets.mockResolvedValue([])
    const user = userEvent.setup()
    renderTickets()

    expect(await screen.findByText(/ainda não comprou nenhuma passagem/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Buscar horários' }))
    expect(screen.getByText('Página inicial')).toBeInTheDocument()
  })

  it('erro de rede mostra a mensagem e deixa tentar de novo', async () => {
    listTickets
      .mockRejectedValueOnce(new ApiError(0, 'Não foi possível falar com a API.'))
      .mockResolvedValueOnce([makeTicket()])
    const user = userEvent.setup()
    renderTickets()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com a API.')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Passagem nº 1')).toBeInTheDocument()
  })

  it('deslogado é mandado para o login, com volta para cá', () => {
    renderTickets({ status: 'anonymous' })

    expect(JSON.parse(screen.getByTestId('login').textContent)).toEqual({
      from: '/minhas-passagens',
    })
    expect(listTickets).not.toHaveBeenCalled()
  })

  it('enquanto a sessão está sendo conferida, espera sem chamar a API', () => {
    renderTickets({ status: 'checking' })

    expect(screen.getByRole('status')).toHaveTextContent('Carregando suas passagens…')
    expect(listTickets).not.toHaveBeenCalled()
  })

  // Critério 4 do FEAT-025: 401 (refresh já falhou) → login.
  it('sessão expirada ao listar leva ao login', async () => {
    renderTickets({
      request: vi.fn().mockRejectedValue(new ApiError(401, 'Sua sessão expirou.')),
    })

    expect(await screen.findByTestId('login')).toHaveTextContent('/minhas-passagens')
  })
})
