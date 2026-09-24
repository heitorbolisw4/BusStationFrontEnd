import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredRefreshToken,
  readStoredRefreshToken,
  storeRefreshToken,
  withRefreshLock,
} from './token'

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

describe('withRefreshLock', () => {
  afterEach(() => {
    delete navigator.locks
  })

  it('sem Web Locks (jsdom, navegador antigo), só executa a função', async () => {
    await expect(withRefreshLock(async () => 'ok')).resolves.toBe('ok')
  })

  it('com Web Locks, executa dentro da trava "busstation-refresh"', async () => {
    const request = vi.fn((_name, fn) => fn())
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    await expect(withRefreshLock(async () => 'ok')).resolves.toBe('ok')
    expect(request).toHaveBeenCalledWith('busstation-refresh', expect.any(Function))
  })
})
