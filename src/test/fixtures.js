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
