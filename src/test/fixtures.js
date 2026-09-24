// Dados no mesmo formato que a API devolve (camelCase, TimeOnly "HH:mm:ss").
export const CITIES = [
  { id: 1, cityName: 'Uberlândia', state: 'MG', acronym: 'UDIA' },
  { id: 2, cityName: 'Uberaba', state: 'MG', acronym: 'URA' },
  { id: 3, cityName: 'Araguari', state: 'MG', acronym: 'ARI' },
]

export function makeDeparture(overrides = {}) {
  return {
    boardingId: 10,
    routeId: 3,
    routeName: 'UDIA-URA',
    originCity: 'Uberlândia',
    originAcronym: 'UDIA',
    destinationCity: 'Uberaba',
    destinationAcronym: 'URA',
    kilometers: 105,
    boardingDate: '2026-10-01',
    boardingTime: '05:40:00',
    seats: 28,
    price: 44.1,
    ...overrides,
  }
}

// JWT falso com o mesmo formato do da API (só o payload importa para o
// front; a assinatura é lixo porque o front nunca a verifica).
export function makeToken({ expiresInSeconds = 300, now = Date.now() } = {}) {
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    nameid: '3',
    email: 'maria@example.com',
    exp: Math.floor(now / 1000) + expiresInSeconds,
  })
  return `${header}.${payload}.assinatura-falsa`
}

export const PROFILE = { id: 3, name: 'Maria Souza', email: 'maria@example.com', age: 30 }
