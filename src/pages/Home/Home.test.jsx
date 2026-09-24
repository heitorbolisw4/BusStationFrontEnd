import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'
import { listCities } from '../../api/cities'
import { searchBoardings } from '../../api/boardings'
import { CITIES, makeDeparture } from '../../test/fixtures'

// A Home é quem conversa com a API. No teste unitário, a API vira dublê:
// controlamos o que cada chamada devolve e quando ela responde.
vi.mock('../../api/cities', () => ({ listCities: vi.fn() }))
vi.mock('../../api/boardings', () => ({ searchBoardings: vi.fn() }))

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

async function renderReadyHome() {
  const user = userEvent.setup()
  render(<Home />)
  await screen.findByLabelText('Origem')
  return user
}

describe('Home', () => {
  beforeEach(() => {
    listCities.mockReset()
    searchBoardings.mockReset()
  })

  describe('carregamento das cidades', () => {
    it('mostra "carregando" até a API responder, depois o formulário', async () => {
      const cities = deferred()
      listCities.mockReturnValue(cities.promise)

      render(<Home />)
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

      render(<Home />)

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
        render(<Home />)

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

      render(<Home />)

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
})
