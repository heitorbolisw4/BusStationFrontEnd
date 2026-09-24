import { apiFetch } from './client'

// POST /register { name, email, password, age } -> 201 sem corpo
// Erros: 400 { message } (validação) · 409 { message } (e-mail já usado)
export function register({ name, email, password, age }) {
  return apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, age }),
  })
}

// POST /login { email, password } -> { token, refreshToken, expiresIn }
// Erro: 401 sem corpo (e-mail ou senha errados — a API não diz qual, de propósito)
//
// `token` é o de acesso (curto, vai no header). `refreshToken` serve só
// para pedir um par novo em /refresh. Versões antigas da API devolvem
// apenas { token } — quem chama precisa tolerar refreshToken ausente.
export function login({ email, password }) {
  return apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// POST /refresh { refreshToken } -> { token, refreshToken, expiresIn }
// Rotação: o refresh token enviado deixa de valer. Usar o mesmo duas
// vezes faz a API revogar TODAS as sessões do usuário (detecção de
// reuso) — por isso o AuthProvider nunca dispara dois refresh juntos.
export function refresh(refreshToken) {
  return apiFetch('/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

// POST /logout { refreshToken } -> 204 sempre (até com token inválido)
export function logout(refreshToken) {
  return apiFetch('/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

// GET /user/me -> { id, name, email, age }
// O token só carrega id e e-mail; o nome para exibir vem daqui.
export function getProfile(token) {
  return apiFetch('/user/me', { token })
}
