import { apiFetch } from './client'

// POST /register { name, email, password, age } -> 201 sem corpo
// Erros: 400 { message } (validação) · 409 { message } (e-mail já usado)
export function register({ name, email, password, age }) {
  return apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, age }),
  })
}

// POST /login { email, password } -> { token }
// Erro: 401 sem corpo (e-mail ou senha errados — a API não diz qual, de propósito)
export async function login({ email, password }) {
  const { token } = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return token
}

// GET /user/me -> { id, name, email, age }
// O token só carrega id e e-mail; o nome para exibir vem daqui.
export function getProfile(token) {
  return apiFetch('/user/me', { token })
}
