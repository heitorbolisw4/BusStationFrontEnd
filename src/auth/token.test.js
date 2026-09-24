import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredToken,
  getTokenExpiry,
  isTokenValid,
  readStoredToken,
  storeToken,
} from './token'
import { makeToken } from '../test/fixtures'

describe('getTokenExpiry', () => {
  it('lê o exp do payload e devolve em milissegundos', () => {
    const now = Date.UTC(2026, 8, 24, 22, 0)
    expect(getTokenExpiry(makeToken({ now, expiresInSeconds: 300 }))).toBe(now + 300_000)
  })

  it('decodifica base64url (com - e _), não só base64 comum', () => {
    // Payload que em base64 teria "+" e "/": o JWT troca por "-" e "_".
    const payload = btoa(JSON.stringify({ exp: 2000000000, x: '>>>???' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(payload).toMatch(/[-_]/)
    expect(getTokenExpiry(`h.${payload}.s`)).toBe(2000000000 * 1000)
  })

  it.each([
    ['string sem pontos', 'nao-e-jwt'],
    ['payload que não é JSON', 'a.bm9wZQ.c'],
    ['payload sem exp', `a.${btoa('{"sub":"1"}')}.c`],
  ])('devolve null para %s', (_label, token) => {
    expect(getTokenExpiry(token)).toBeNull()
  })
})

describe('isTokenValid', () => {
  it('true antes do exp, false a partir dele', () => {
    // exp do JWT é em segundos: alinha `now` ao segundo para a conta ser exata.
    const now = Math.floor(Date.now() / 1000) * 1000
    const token = makeToken({ now, expiresInSeconds: 60 })
    expect(isTokenValid(token, now + 59_999)).toBe(true)
    expect(isTokenValid(token, now + 60_000)).toBe(false)
  })

  it('false para ausente ou malformado', () => {
    expect(isTokenValid(null)).toBe(false)
    expect(isTokenValid('lixo')).toBe(false)
  })
})

describe('storage do token', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('guarda, lê e apaga', () => {
    storeToken('abc')
    expect(readStoredToken()).toBe('abc')
    clearStoredToken()
    expect(readStoredToken()).toBeNull()
  })

  it('não quebra quando o navegador bloqueia o storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })

    expect(readStoredToken()).toBeNull()
    expect(() => storeToken('abc')).not.toThrow()
    spy.mockRestore()
    vi.restoreAllMocks()
  })
})
