import { beforeEach, describe, expect, it } from 'vitest'
import { readLastSearch, saveLastSearch } from './lastSearch'

const SEARCH = { originCityId: 1, destinationCityId: 2, date: '2026-10-01' }

describe('lastSearch', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('salva e lê a última busca', () => {
    saveLastSearch(SEARCH)
    expect(readLastSearch('2026-09-24')).toEqual(SEARCH)
  })

  it('sem busca salva, devolve null', () => {
    expect(readLastSearch('2026-09-24')).toBeNull()
  })

  it('busca para hoje ainda vale; para ontem, não', () => {
    saveLastSearch(SEARCH)
    expect(readLastSearch('2026-10-01')).toEqual(SEARCH)
    expect(readLastSearch('2026-10-02')).toBeNull()
  })

  it.each([
    ['JSON quebrado', '{nao-e-json'],
    ['sem data', JSON.stringify({ originCityId: 1, destinationCityId: 2 })],
    ['id como string', JSON.stringify({ ...SEARCH, originCityId: '1' })],
  ])('conteúdo inválido (%s) é ignorado', (_label, raw) => {
    sessionStorage.setItem('busstation.lastSearch', raw)
    expect(readLastSearch('2026-09-24')).toBeNull()
  })
})
