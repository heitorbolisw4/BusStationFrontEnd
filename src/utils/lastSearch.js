import { todayISO } from './date'

/* Última busca feita, para refazê-la ao voltar para a Home.

   Caso principal: o usuário acha a saída, clica em "Comprar", é mandado
   para /entrar e, depois do login, volta. Sem isto a Home remontaria
   vazia e ele teria que buscar tudo de novo.

   sessionStorage (e não localStorage): vale só para esta aba e some ao
   fechá-la — busca de ontem não deve reaparecer amanhã. */

const KEY = 'busstation.lastSearch'

export function saveLastSearch(params) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(params))
  } catch {
    // Sem storage, só não restaura. Nada quebra.
  }
}

// Devolve { originCityId, destinationCityId, date } ou null se não houver,
// estiver corrompida ou a data já tiver passado (a API recusaria).
export function readLastSearch(today = todayISO()) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY))
    if (!saved || typeof saved.date !== 'string' || saved.date < today) return null
    if (!Number.isInteger(saved.originCityId) || !Number.isInteger(saved.destinationCityId)) {
      return null
    }
    return saved
  } catch {
    return null
  }
}
