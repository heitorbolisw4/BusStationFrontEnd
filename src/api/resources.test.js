import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client'
import { listCities } from './cities'
import { searchBoardings } from './boardings'

// Aqui só interessa se cada função monta a rota certa — o comportamento
// HTTP já é coberto em client.test.js. Por isso o apiFetch vira um dublê.
vi.mock('./client', () => ({ apiFetch: vi.fn() }))

describe('funções de recurso da API', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue([])
  })

  it('listCities chama GET /cities/list', async () => {
    await listCities()
    expect(apiFetch).toHaveBeenCalledWith('/cities/list')
  })

  it('searchBoardings monta a query string com os três parâmetros', async () => {
    await searchBoardings({ originCityId: 1, destinationCityId: 2, date: '2026-10-01' })

    expect(apiFetch).toHaveBeenCalledWith(
      '/boardings/search?originCityId=1&destinationCityId=2&date=2026-10-01',
    )
  })

  it('searchBoardings escapa caracteres especiais em vez de quebrar a URL', async () => {
    await searchBoardings({ originCityId: 1, destinationCityId: 2, date: 'a&b c' })

    const [path] = apiFetch.mock.calls[0]
    const query = new URLSearchParams(path.split('?')[1])
    expect(query.get('date')).toBe('a&b c')
    expect(query.get('destinationCityId')).toBe('2')
  })

  it('devolve o que o apiFetch devolveu', async () => {
    apiFetch.mockResolvedValue([{ id: 7 }])
    await expect(listCities()).resolves.toEqual([{ id: 7 }])
  })
})
