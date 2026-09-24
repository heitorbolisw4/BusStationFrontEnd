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

// Par de tokens como POST /login e POST /refresh devolvem. O front não
// abre o JWT, então qualquer string serve — numerar ajuda a ler o teste.
export function makePair(n = 1) {
  return { token: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn: 900 }
}

export const PROFILE = { id: 3, name: 'Maria Souza', email: 'maria@example.com', age: 30 }
