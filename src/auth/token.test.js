import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredRefreshToken, readStoredRefreshToken, storeRefreshToken } from './token'

describe('storage do refresh token', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('guarda, lê e apaga', () => {
    storeRefreshToken('refresh-1')
    expect(readStoredRefreshToken()).toBe('refresh-1')
    clearStoredRefreshToken()
    expect(readStoredRefreshToken()).toBeNull()
  })

  it('guardar "nada" (API antiga, sem refresh token) apaga o anterior', () => {
    storeRefreshToken('refresh-velho')
    storeRefreshToken(undefined)
    expect(readStoredRefreshToken()).toBeNull()
  })

  it('não quebra quando o navegador bloqueia o storage', () => {
    const blocked = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked)

    expect(readStoredRefreshToken()).toBeNull()
    expect(() => storeRefreshToken('x')).not.toThrow()
    expect(() => clearStoredRefreshToken()).not.toThrow()
  })
})
