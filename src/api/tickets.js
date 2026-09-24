import { apiFetch } from './client'

/* Rotas de passagem exigem usuário logado. As funções recebem o token
   como 1º argumento para caberem direto no auth.request:
   request((token) => buyTicket(token, 12)). */

// POST /tickets/create { boardingId } -> 201
//   { id, boardingId, routeId, routeName, boardingDate, boardingTime, farePaid, purchasedOn }
// Erros: 400 { message: "Dont have seats" } · 404 (saída não existe) · 401
export function buyTicket(token, boardingId) {
  return apiFetch('/tickets/create', {
    method: 'POST',
    token,
    body: JSON.stringify({ boardingId }),
  })
}

// GET /tickets/list -> [TicketResponse] (só as do usuário do token; sem ordem garantida)
export function listTickets(token) {
  return apiFetch('/tickets/list', { token })
}
