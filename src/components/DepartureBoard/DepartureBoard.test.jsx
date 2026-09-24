import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import DepartureBoard from './DepartureBoard'
import { makeDeparture } from '../../test/fixtures'

// O componente é "burro" de propósito (só recebe props), então dá para
// testar cada estado da tela sem mockar API nenhuma.
function renderBoard(props) {
  return render(<DepartureBoard departures={[]} status="idle" errorMessage="" {...props} />)
}

describe('DepartureBoard', () => {
  it('no estado idle, orienta o usuário a fazer a busca', () => {
    renderBoard()
    expect(screen.getByText(/Escolha origem, destino e data/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('mostra mensagem de carregamento', () => {
    renderBoard({ status: 'loading' })
    expect(screen.getByRole('status')).toHaveTextContent('Procurando saídas…')
  })

  it('usa a mensagem de carregamento recebida por prop (aviso de cold start)', () => {
    renderBoard({ status: 'loading', loadingMessage: 'O servidor está acordando' })
    expect(screen.getByRole('status')).toHaveTextContent('O servidor está acordando')
  })

  it('mostra o erro como alerta acessível', () => {
    renderBoard({ status: 'error', errorMessage: 'API fora do ar' })
    expect(screen.getByRole('alert')).toHaveTextContent('API fora do ar')
  })

  it('trata lista vazia como "nenhuma saída", não como erro', () => {
    renderBoard({ status: 'ready', departures: [] })
    expect(screen.getByText(/Nenhuma saída para esse trecho/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renderiza uma linha por saída com hora, trecho, km, vagas e preço', () => {
    renderBoard({ status: 'ready', departures: [makeDeparture()] })

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(1)

    const row = within(rows[0])
    const time = row.getByText('05:40')
    expect(time.tagName).toBe('TIME')
    // O valor cru (com segundos) vai no atributo, para leitor de tela.
    expect(time).toHaveAttribute('datetime', '05:40:00')
    expect(row.getByText(/Uberlândia para Uberaba · 105 km/)).toBeInTheDocument()
    expect(row.getByText('28 vagas')).toBeInTheDocument()
    // Intl usa espaço não separável entre "R$" e o número.
    expect(row.getByText(/^R\$\s44,10$/)).toBeInTheDocument()
  })

  it('usa singular para uma vaga e para uma saída encontrada', () => {
    renderBoard({ status: 'ready', departures: [makeDeparture({ seats: 1 })] })

    expect(screen.getByText('1 vaga')).toBeInTheDocument()
    expect(screen.getByText(/^1 saída encontrada\./)).toBeInTheDocument()
  })

  it('conta as saídas no plural e mantém a ordem recebida da API', () => {
    const departures = [
      makeDeparture({ boardingId: 1, boardingTime: '06:15:00' }),
      makeDeparture({ boardingId: 2, boardingTime: '09:00:00' }),
      makeDeparture({ boardingId: 3, boardingTime: '18:20:00' }),
    ]
    renderBoard({ status: 'ready', departures })

    expect(screen.getByText(/^3 saídas encontradas\./)).toBeInTheDocument()
    const times = screen.getAllByRole('listitem').map((li) => li.querySelector('time').textContent)
    expect(times).toEqual(['06:15', '09:00', '18:20'])
  })

  // Limite da regra "poucas vagas": 5 destaca, 6 não.
  it.each([
    [5, true],
    [6, false],
  ])('com %i vagas, destaque de poucas vagas = %s', (seats, highlighted) => {
    renderBoard({ status: 'ready', departures: [makeDeparture({ seats })] })

    const badge = screen.getByText(`${seats} vagas`)
    // CSS Modules gera nomes tipo "_seatsLow_a1b2c"; checamos só o trecho estável.
    expect(badge.className.includes('seatsLow')).toBe(highlighted)
  })
})
