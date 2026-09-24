import { apiFetch } from './client'

/* Um arquivo por recurso da API, espelhando os grupos do
   Program.cs. Quem chama não precisa saber a rota nem o verbo —
   só o nome da operação. */

// GET /cities/list -> [{ id, cityName, state, acronym }]
export function listCities() {
  return apiFetch('/cities/list')
}
