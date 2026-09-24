import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSlowFlag } from './useSlowFlag'

describe('useSlowFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fica false enquanto o atraso não passou', () => {
    const { result } = renderHook(() => useSlowFlag(true, 5000))

    act(() => vi.advanceTimersByTime(4999))
    expect(result.current).toBe(false)
  })

  it('vira true quando o atraso passa com active ligado', () => {
    const { result } = renderHook(() => useSlowFlag(true, 5000))

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current).toBe(true)
  })

  it('nunca liga quando active é false', () => {
    const { result } = renderHook(() => useSlowFlag(false, 5000))

    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toBe(false)
  })

  it('desliga assim que active desliga, e recomeça a contagem do zero', () => {
    const { result, rerender } = renderHook(({ active }) => useSlowFlag(active, 5000), {
      initialProps: { active: true },
    })
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current).toBe(true)

    rerender({ active: false })
    expect(result.current).toBe(false)

    // Nova requisição: não pode herdar o "lento" da anterior.
    rerender({ active: true })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(4999))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('carregamento que termina antes do atraso nunca mostra o aviso', () => {
    const { result, rerender } = renderHook(({ active }) => useSlowFlag(active, 5000), {
      initialProps: { active: true },
    })
    act(() => vi.advanceTimersByTime(3000))
    rerender({ active: false })
    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current).toBe(false)
  })
})
