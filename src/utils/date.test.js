import { describe, expect, it } from 'vitest'
import { todayISO } from './date'

// O setup fixa TZ=America/Sao_Paulo (UTC-3, sem horário de verão).
describe('todayISO', () => {
  it('formata a data local como aaaa-mm-dd, com zero à esquerda', () => {
    expect(todayISO(new Date(2026, 0, 5, 10, 0))).toBe('2026-01-05')
  })

  // Regressão: a versão antiga usava toISOString (UTC). 22:30 em
  // Brasília já é 01:30 do dia seguinte em UTC — e o site mostrava amanhã.
  it('continua no dia local depois das 21h (quando o UTC já virou o dia)', () => {
    const lateNight = new Date(2026, 8, 24, 22, 30)
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-09-25') // o bug antigo
    expect(todayISO(lateNight)).toBe('2026-09-24')
  })

  it('vira o ano corretamente no último minuto de dezembro', () => {
    expect(todayISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('usa o relógio atual quando chamado sem argumento', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
