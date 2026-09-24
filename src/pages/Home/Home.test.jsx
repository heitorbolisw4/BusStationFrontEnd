import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import Home from './Home'
import { listCities } from '../../api/cities'
import { searchBoardings } from '../../api/boardings'
import { buyTicket } from '../../api/tickets'
import { ApiError } from '../../api/client'
import { AuthContext } from '../../auth/auth-context'
import { saveLastSearch } from '../../utils/lastSearch'
import { CITIES, makeDeparture } from '../../test/fixtures'

// A Home é quem conversa com a API. No teste unitário, a API vira dublê:
// controlamos o que cada chamada devolve e quando ela responde.
vi.mock('../../api/cities', () => ({ listCities: vi.fn() }))
vi.mock('../../api/boardings', () => ({ searchBoardings: vi.fn() }))
vi.mock('../../api/tickets', () => ({ buyTicket: vi.fn() }))

// Tela de login falsa: mostra o state recebido, para o teste conferir
// que a Home mandou o usuário para lá com o motivo certo.
function LoginProbe() {
  const location = useLocation()
  return <p data-testid="login">{JSON.stringify(location.state)}</p>
}

// Contexto de auth montado à mão: a Home só precisa de status e request.
// request chama a função com um token fixo, como faria o AuthProvider.
function renderHome(auth = {}) {
  const value = {
    status: 'anonymous',
    request: vi.fn((call) => call('access-1')),
    ...auth,
  }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<LoginProbe />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

// Promise que o próprio teste resolve na hora que quiser — é assim que
// se simula "a API demorou" ou "as respostas chegaram fora de ordem".
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function renderReadyHome(auth) {
  const user = userEvent.setup()
  renderHome(auth)
  await screen.findByLabelText('Origem')
  return user
}

describe('Home', () => {
  beforeEach(() => {
    listCities.mockReset()
    searchBoardings.mockReset()
    buyTicket.mockReset()
    // A Home salva a última busca: sem limpar, um teste vazaria no outro.
    sessionStorage.clear()
  })

  describe('carregamento das cidades', () => {
    it('mostra "carregando" até a API responder, depois o formulário', async () => {
      const cities = deferred()
      listCities.mockReturnValue(cities.promise)

      renderHome()
      expect(screen.getByText('Carregando cidades…')).toBeInTheDocument()

      cities.resolve(CITIES)

      expect(await screen.findByLabelText('Origem')).toBeInTheDocument()
      expect(screen.queryByText('Carregando cidades…')).not.toBeInTheDocument()
      expect(screen.getByText(/Triângulo Mineiro · 3 cidades/)).toBeInTheDocument()
    })

    it('mostra o erro e busca de novo ao clicar em "Tentar de novo"', async () => {
      listCities
        .mockRejectedValueOnce(new Error('Não foi possível falar com a API. Ela está rodando?'))
        .mockResolvedValueOnce(CITIES)
      const user = userEvent.setup()

      renderHome()

      expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível falar com a API/)
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

      expect(await screen.findByLabelText('Origem')).toBeInTheDocument()
      expect(listCities).toHaveBeenCalledTimes(2)
    })

    it('depois de 5s carregando, explica o cold start em vez de parecer travado', async () => {
      // Relógio falso: não dá para esperar 5 segundos de verdade num teste.
      vi.useFakeTimers()
      try {
        const cities = deferred()
        listCities.mockReturnValue(cities.promise)
        renderHome()

        act(() => vi.advanceTimersByTime(4999))
        expect(screen.getByRole('status')).toHaveTextContent('Carregando cidades…')

        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByRole('status')).toHaveTextContent(/servidor está acordando/)

        await act(async () => cities.resolve(CITIES))
        expect(screen.getByLabelText('Origem')).toBeInTheDocument()
        expect(screen.queryByText(/servidor está acordando/)).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('com menos de duas cidades, explica que a busca não é possível', async () => {
      listCities.mockResolvedValue([CITIES[0]])

      renderHome()

      expect(await screen.findByText(/pelo menos duas cidades/)).toBeInTheDocument()
      expect(screen.queryByLabelText('Origem')).not.toBeInTheDocument()
    })
  })

  describe('busca de saídas', () => {
    beforeEach(() => {
      listCities.mockResolvedValue(CITIES)
    })

    it('antes de buscar, o painel fica em idle', async () => {
      await renderReadyHome()
      expect(screen.getByText(/Escolha origem, destino e data acima/)).toBeInTheDocument()
      expect(searchBoardings).not.toHaveBeenCalled()
    })

    it('busca com os parâmetros do formulário e mostra o resultado', async () => {
      searchBoardings.mockResolvedValue([makeDeparture()])
      const user = await renderReadyHome()

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))

      expect(await screen.findByText('05:40')).toBeInTheDocument()
      expect(searchBoardings).toHaveBeenCalledWith(
        expect.objectContaining({ originCityId: 1, destinationCityId: 2 }),
      )
    })

    it('mostra "buscando" no botão e no painel enquanto a API não responde', async () => {
      const search = deferred()
      searchBoardings.mockReturnValue(search.promise)
      const user = await renderReadyHome()

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))

      expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled()
      expect(screen.getByText('Procurando saídas…')).toBeInTheDocument()

      search.resolve([])
      expect(await screen.findByText(/Nenhuma saída para esse trecho/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Buscar horários' })).toBeEnabled()
    })

    it('busca demorada troca "Procurando saídas…" pelo aviso de cold start', async () => {
      const search = deferred()
      searchBoardings.mockReturnValue(search.promise)
      await renderReadyHome()

      // O timer do aviso nasce no clique, então o relógio falso liga antes dele.
      // fireEvent (e não userEvent) porque o userEvent espera timers reais.
      vi.useFakeTimers()
      try {
        fireEvent.click(screen.getByRole('button', { name: 'Buscar horários' }))
        expect(screen.getByText('Procurando saídas…')).toBeInTheDocument()

        act(() => vi.advanceTimersByTime(5000))
        expect(screen.getByText(/servidor está acordando/)).toBeInTheDocument()

        await act(async () => search.resolve([makeDeparture()]))
        expect(screen.getByText('05:40')).toBeInTheDocument()
        expect(screen.queryByText(/servidor está acordando/)).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('mostra o erro da busca sem derrubar o formulário', async () => {
      searchBoardings.mockRejectedValue(new Error('You must provide a valid date'))
      const user = await renderReadyHome()

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('You must provide a valid date')
      expect(screen.getByLabelText('Origem')).toBeInTheDocument()
    })

    it('não dispara uma 2ª busca enquanto a 1ª ainda está pendente', async () => {
      const first = deferred()
      searchBoardings.mockReturnValue(first.promise)
      const user = await renderReadyHome()

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))
      // Botão desabilitado não recebe clique, mas Enter/submit programático
      // ainda chega no form — é a guarda do handleSubmit que segura esse caso.
      await user.selectOptions(screen.getByLabelText('Destino'), '3')
      screen.getByLabelText('Destino').form.requestSubmit()

      expect(searchBoardings).toHaveBeenCalledTimes(1)
      first.resolve([])
    })

    it('uma nova busca substitui o resultado da anterior', async () => {
      searchBoardings
        .mockResolvedValueOnce([makeDeparture({ boardingId: 1, boardingTime: '05:40:00' })])
        .mockResolvedValueOnce([makeDeparture({ boardingId: 2, boardingTime: '09:00:00' })])
      const user = await renderReadyHome()

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))
      expect(await screen.findByText('05:40')).toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText('Destino'), '3')
      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))

      const board = screen.getByRole('list')
      expect(await within(board).findByText('09:00')).toBeInTheDocument()
      expect(within(board).queryByText('05:40')).not.toBeInTheDocument()
      expect(searchBoardings).toHaveBeenLastCalledWith(
        expect.objectContaining({ originCityId: 1, destinationCityId: 3 }),
      )
    })
  })

  describe('compra', () => {
    const LOGGED_IN = { status: 'authenticated' }

    beforeEach(() => {
      listCities.mockResolvedValue(CITIES)
      searchBoardings.mockResolvedValue([
        makeDeparture({ boardingId: 10, boardingTime: '05:40:00', seats: 28 }),
        makeDeparture({ boardingId: 11, boardingTime: '09:00:00', seats: 3 }),
      ])
    })

    // Busca e espera o painel aparecer; devolve o userEvent.
    async function searchAs(auth) {
      const user = await renderReadyHome(auth)
      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))
      await screen.findByText('05:40')
      return user
    }

    // Critério 2 do FEAT-025 (fluxo feliz).
    it('logado: Comprar → Confirmar compra a saída e mostra o sucesso', async () => {
      buyTicket.mockResolvedValue({ id: 99, boardingId: 10 })
      const user = await searchAs(LOGGED_IN)

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      // Confirmação mostra o preço antes de comprar de fato.
      expect(buyTicket).not.toHaveBeenCalled()
      // Intl usa espaço não separável depois do "R$" — por isso regex.
      await user.click(screen.getByRole('button', { name: /^Confirmar R\$\s44,10$/ }))

      expect(await screen.findByText('Comprada ✓')).toBeInTheDocument()
      expect(buyTicket).toHaveBeenCalledWith('access-1', 10)
      expect(screen.getByRole('link', { name: 'Ver minhas passagens' })).toHaveAttribute(
        'href',
        '/minhas-passagens',
      )
      // A vaga vendida some do contador sem precisar buscar de novo.
      expect(screen.getByText('27 vagas')).toBeInTheDocument()
    })

    it('Cancelar desiste sem chamar a API', async () => {
      const user = await searchAs(LOGGED_IN)

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.getByRole('button', { name: 'Comprar passagem das 05:40' })).toBeEnabled()
      expect(buyTicket).not.toHaveBeenCalled()
    })

    it('enquanto compra, os outros botões Comprar ficam travados', async () => {
      buyTicket.mockReturnValue(new Promise(() => {}))
      const user = await searchAs(LOGGED_IN)

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      await user.click(screen.getByRole('button', { name: /^Confirmar/ }))

      expect(screen.getByRole('button', { name: 'Comprando…' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Comprar passagem das 09:00' })).toBeDisabled()
    })

    // Critério 2 do FEAT-025: erro "sem vaga".
    it('sem vaga (400) avisa que esgotou e trava a saída', async () => {
      buyTicket.mockRejectedValue(new ApiError(400, 'Dont have seats'))
      const user = await searchAs(LOGGED_IN)

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 09:00' }))
      await user.click(screen.getByRole('button', { name: /^Confirmar/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Esgotou: não há mais vagas nesta saída.',
      )
      expect(screen.getByText('Esgotado')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Comprar passagem das 09:00' })).toBeDisabled()
    })

    it('saída que sumiu (404) pede para buscar de novo', async () => {
      buyTicket.mockRejectedValue(new ApiError(404, 'A API respondeu 404.'))
      const user = await searchAs(LOGGED_IN)

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      await user.click(screen.getByRole('button', { name: /^Confirmar/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/não está mais disponível/)
    })

    // Critério 2 do FEAT-025: erro "não logado".
    it('deslogado: Comprar leva ao login explicando o motivo', async () => {
      const user = await searchAs({ status: 'anonymous' })

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))

      const state = JSON.parse(screen.getByTestId('login').textContent)
      expect(state).toEqual({ from: '/', reason: 'purchase' })
      expect(buyTicket).not.toHaveBeenCalled()
    })

    // Critério 4 do FEAT-025: 401 (refresh já falhou no AuthProvider) → login.
    it('sessão expirada no meio da compra leva ao login', async () => {
      const user = await searchAs({
        status: 'authenticated',
        request: vi.fn().mockRejectedValue(new ApiError(401, 'Sua sessão expirou.')),
      })

      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      await user.click(screen.getByRole('button', { name: /^Confirmar/ }))

      expect(await screen.findByTestId('login')).toHaveTextContent('"from":"/"')
    })

    it('uma nova busca limpa a compra anterior', async () => {
      buyTicket.mockResolvedValue({ id: 99 })
      const user = await searchAs(LOGGED_IN)
      await user.click(screen.getByRole('button', { name: 'Comprar passagem das 05:40' }))
      await user.click(screen.getByRole('button', { name: /^Confirmar/ }))
      await screen.findByText('Comprada ✓')

      await user.click(screen.getByRole('button', { name: 'Buscar horários' }))

      await vi.waitFor(() => expect(screen.queryByText('Comprada ✓')).not.toBeInTheDocument())
    })
  })

  describe('busca restaurada (volta do login)', () => {
    it('refaz a última busca da aba e pré-preenche o formulário', async () => {
      listCities.mockResolvedValue(CITIES)
      searchBoardings.mockResolvedValue([makeDeparture()])
      saveLastSearch({ originCityId: 3, destinationCityId: 2, date: '2099-01-15' })

      renderHome()

      expect(await screen.findByText('05:40')).toBeInTheDocument()
      expect(searchBoardings).toHaveBeenCalledTimes(1)
      expect(searchBoardings).toHaveBeenCalledWith({
        originCityId: 3,
        destinationCityId: 2,
        date: '2099-01-15',
      })
      expect(screen.getByLabelText('Origem')).toHaveValue('3')
      expect(screen.getByLabelText('Data da ida')).toHaveValue('2099-01-15')
    })

    it('busca salva com data passada é ignorada', async () => {
      listCities.mockResolvedValue(CITIES)
      saveLastSearch({ originCityId: 3, destinationCityId: 2, date: '2000-01-01' })

      renderHome()

      await screen.findByLabelText('Origem')
      expect(searchBoardings).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Origem')).toHaveValue('1')
    })
  })
})
