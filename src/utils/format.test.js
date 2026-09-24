import { describe, expect, it } from 'vitest'
import {
  boardingDateTime,
  formatDateOnly,
  formatPrice,
  hourAndMinute,
  parseDateOnly,
} from './format'

// Setup fixa TZ=America/Sao_Paulo (UTC-3).
describe('format', () => {
  it('formatPrice usa real brasileiro', () => {
    expect(formatPrice(44.1)).toMatch(/^R\$\s44,10$/)
  })

  it('hourAndMinute corta os segundos do TimeOnly', () => {
    expect(hourAndMinute('05:40:00')).toBe('05:40')
  })

  // Regressão do mesmo tipo do bug do todayISO: new Date("2026-10-01")
  // é meia-noite UTC = 30/09 às 21h em Brasília.
  it('parseDateOnly monta a data no fuso local, sem voltar um dia', () => {
    expect(new Date('2026-10-01').getDate()).toBe(30) // a armadilha
    const date = parseDateOnly('2026-10-01')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 1])
  })

  it('formatDateOnly escreve a data por extenso em português', () => {
    expect(formatDateOnly('2026-10-01')).toMatch(/qui.*1 de out.*2026/)
  })

  it('boardingDateTime junta data e hora do embarque', () => {
    expect(boardingDateTime('2026-10-01', '05:40:00')).toEqual(new Date(2026, 9, 1, 5, 40))
  })
})
