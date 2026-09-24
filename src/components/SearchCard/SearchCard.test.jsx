import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchCard from './SearchCard'
import { CITIES } from '../../test/fixtures'

function renderCard(props = {}) {
  const onSearch = vi.fn()
  // userEvent simula o usuário de verdade (foco, teclado, clique),
  // diferente do fireEvent, que só dispara o evento cru.
  const user = userEvent.setup()
  render(<SearchCard cities={CITIES} onSearch={onSearch} isSearching={false} {...props} />)

  return {
    user,
    onSearch,
    origin: screen.getByLabelText('Origem'),
    destination: screen.getByLabelText('Destino'),
    date: screen.getByLabelText('Data da ida'),
    submit: screen.getByRole('button', { name: /Buscar horários|Buscando/ }),
  }
}

describe('SearchCard', () => {
  beforeEach(() => {
    // Só Date é falsificado: fingir setTimeout travaria o userEvent.
    vi.useFakeTimers({ toFake: ['Date'] })
    // 22:30 em Brasília — horário em que o bug de UTC aparecia.
    vi.setSystemTime(new Date(2026, 8, 24, 22, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa com a 1ª cidade como origem, a 2ª como destino e a data de hoje', () => {
    const { origin, destination, date } = renderCard()

    expect(origin).toHaveValue('1')
    expect(destination).toHaveValue('2')
    expect(date).toHaveValue('2026-09-24')
    expect(date).toHaveAttribute('min', '2026-09-24')
  })

  it('lista todas as cidades como "Nome · UF" nos dois selects', () => {
    const { origin } = renderCard()
    const labels = Array.from(origin.options).map((o) => o.textContent)
    expect(labels).toEqual(['Uberlândia · MG', 'Uberaba · MG', 'Araguari · MG'])
  })

  it('envia os IDs como número (o C# espera int) junto com a data', async () => {
    const { user, onSearch, destination, submit } = renderCard()

    await user.selectOptions(destination, '3')
    await user.click(submit)

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith({
      originCityId: 1,
      destinationCityId: 3,
      date: '2026-09-24',
    })
  })

  it('o botão de inverter troca origem e destino', async () => {
    const { user, onSearch, origin, destination, submit } = renderCard()

    await user.click(screen.getByRole('button', { name: 'Inverter origem e destino' }))

    expect(origin).toHaveValue('2')
    expect(destination).toHaveValue('1')
    await user.click(submit)
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ originCityId: 2, destinationCityId: 1 }),
    )
  })

  it('bloqueia a busca e avisa quando origem e destino são iguais', async () => {
    const { user, onSearch, destination, submit } = renderCard()

    await user.selectOptions(destination, '1')

    expect(screen.getByRole('alert')).toHaveTextContent(/mesma cidade/)
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('volta a liberar quando o usuário corrige o destino', async () => {
    const { user, destination, submit } = renderCard()

    await user.selectOptions(destination, '1')
    await user.selectOptions(destination, '3')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(submit).toBeEnabled()
  })

  it('enquanto busca, troca o texto e desabilita o botão', async () => {
    const { user, onSearch, submit } = renderCard({ isSearching: true })

    expect(submit).toHaveTextContent('Buscando…')
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(onSearch).not.toHaveBeenCalled()
  })

  // Submissão implícita só vale a partir de <input> — Enter num <select> não envia.
  it('Enter no campo de data também dispara a busca', async () => {
    const { user, onSearch, date } = renderCard()

    date.focus()
    await user.keyboard('{Enter}')

    expect(onSearch).toHaveBeenCalledTimes(1)
  })
})
