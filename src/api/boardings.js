import { apiFetch } from './client'

/* GET /boardings/search?originCityId=1&destinationCityId=2&date=2026-08-10
   -> [{ boardingId, routeId, routeName, originCity, originAcronym,
         destinationCity, destinationAcronym, kilometers,
         boardingDate, boardingTime, seats, price }]

   Endpoint anônimo: consultar horário não exige login. Só a compra
   (POST /tickets/create) vai precisar de token. */
export function searchBoardings({ originCityId, destinationCityId, date }) {
  // URLSearchParams em vez de montar a string na mão: ele escapa os
  // valores. Concatenar `?date=${date}` funciona até o dia em que um
  // valor tiver espaço, & ou acento — aí a URL quebra silenciosamente.
  const query = new URLSearchParams({ originCityId, destinationCityId, date })

  return apiFetch(`/boardings/search?${query}`)
}
