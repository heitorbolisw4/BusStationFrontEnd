import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

// Monta uma Response de verdade (a classe existe no Node), para o
// client ler .ok, .status, .text() e .json() exatamente como no navegador.
function respondWith(body, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(text, { status })
}

describe('apiFetch', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefixa a URL base e devolve o JSON em caso de sucesso', async () => {
    fetchMock.mockResolvedValue(respondWith([{ id: 1 }]))

    await expect(apiFetch('/cities/list')).resolves.toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/cities/list', expect.any(Object))
  })

  it('manda Content-Type JSON e preserva headers e opções de quem chamou', async () => {
    fetchMock.mockResolvedValue(respondWith({}))

    await apiFetch('/tickets/create', {
      method: 'POST',
      body: '{"boardingId":1}',
      headers: { Authorization: 'Bearer abc' },
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options).toMatchObject({
      method: 'POST',
      body: '{"boardingId":1}',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
    })
  })

  it('com token, manda Authorization: Bearer; sem token, não manda o header', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respondWith({})))

    await apiFetch('/user/me', { token: 'abc.def.ghi' })
    await apiFetch('/cities/list')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.def.ghi')
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Authorization')
    // `token` é opção nossa, não do fetch: não pode vazar para ele.
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('token')
  })

  it('devolve null em 204 sem tentar ler corpo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiFetch('/me/password')).resolves.toBeNull()
  })

  // Regressão achada no smoke E2E do staging: POST /register responde
  // 201 sem corpo, e o client quebrava com "Unexpected end of JSON input".
  it('devolve null em 201 sem corpo (POST /register)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }))
    await expect(apiFetch('/register', { method: 'POST' })).resolves.toBeNull()
  })

  it('transforma falha de rede em ApiError com status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await apiFetch('/cities/list').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/Não foi possível falar com a API/)
  })

  // Os formatos de erro que a API realmente devolve hoje.
  it.each([
    ['{ message }', { message: 'Dont have seats' }, 'Dont have seats'],
    ['string JSON', 'Texto cru', 'Texto cru'],
    ['ProblemDetails com title', { title: 'Bad Request', status: 400 }, 'Bad Request'],
    ['ProblemDetails só com detail', { detail: 'Data inválida' }, 'Data inválida'],
  ])('lê a mensagem de erro no formato %s', async (_label, body, expected) => {
    fetchMock.mockResolvedValue(respondWith(body, 400))

    const error = await apiFetch('/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.message).toBe(expected)
  })

  it('usa o texto cru quando o corpo de erro não é JSON', async () => {
    fetchMock.mockResolvedValue(respondWith('<html>Internal Server Error</html>', 500))

    const error = await apiFetch('/x').catch((e) => e)
    expect(error.status).toBe(500)
    expect(error.message).toBe('<html>Internal Server Error</html>')
  })

  it('gera mensagem com o status quando o erro vem sem corpo (ex.: 401 do login)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

    const error = await apiFetch('/login').catch((e) => e)
    expect(error.status).toBe(401)
    expect(error.message).toBe('A API respondeu 401.')
  })

  it('devolve o JSON inteiro como texto se ele não tiver nenhum campo conhecido', async () => {
    fetchMock.mockResolvedValue(respondWith({ errors: ['x'] }, 422))

    const error = await apiFetch('/x').catch((e) => e)
    expect(error.message).toBe('{"errors":["x"]}')
  })
})
