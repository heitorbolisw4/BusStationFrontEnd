import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client'
import { listCities } from './cities'
import { searchBoardings } from './boardings'
import { getProfile, login, logout, refresh, register } from './auth'

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

  it('register faz POST /register com os quatro campos', async () => {
    const data = { name: 'Maria', email: 'm@x.com', password: '123456', age: 30 }
    await register(data)

    expect(apiFetch).toHaveBeenCalledWith('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  })

  it('login faz POST /login e devolve o par de tokens', async () => {
    const pair = { token: 'a', refreshToken: 'r', expiresIn: 900 }
    apiFetch.mockResolvedValue(pair)

    await expect(login({ email: 'm@x.com', password: '123456' })).resolves.toEqual(pair)
    expect(apiFetch).toHaveBeenCalledWith('/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'm@x.com', password: '123456' }),
    })
  })

  it('refresh e logout mandam o refresh token no corpo', async () => {
    await refresh('r1')
    await logout('r2')

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'r1' }),
    })
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'r2' }),
    })
  })

  it('getProfile chama GET /user/me com o token', async () => {
    await getProfile('jwt')
    expect(apiFetch).toHaveBeenCalledWith('/user/me', { token: 'jwt' })
  })

  it('devolve o que o apiFetch devolveu', async () => {
    apiFetch.mockResolvedValue([{ id: 7 }])
    await expect(listCities()).resolves.toEqual([{ id: 7 }])
  })
})
