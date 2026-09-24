/* =========================================================
   Camada HTTP — o único lugar do projeto que sabe que existe
   uma API, uma URL base e um formato de erro.
   Nenhum componente deve chamar fetch() direto.
   ========================================================= */

const BASE_URL = import.meta.env.VITE_API_URL

// Erro próprio para carregar o status HTTP junto da mensagem.
// Assim a tela pode decidir o que fazer com um 401 sem parsear texto.
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// A API responde de três jeitos diferentes em caso de erro:
// string crua (Results.BadRequest("texto")), ProblemDetails (objeto
// com title/detail) ou corpo vazio. Normalizamos tudo aqui.
async function readErrorMessage(response) {
  const text = await response.text()
  if (!text) return `A API respondeu ${response.status}.`

  try {
    const body = JSON.parse(text)
    if (typeof body === 'string') return body
    return body.title ?? body.detail ?? body.message ?? text
  } catch {
    return text
  }
}

// `token` é opcional: rotas públicas não mandam, rotas de usuário logado
// mandam o JWT no header Authorization, no formato "Bearer <token>".
export async function apiFetch(path, { token, ...options } = {}) {
  let response

  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    // fetch só rejeita quando a requisição nem chega a acontecer:
    // API fora do ar, DNS, ou bloqueio de CORS.
    throw new ApiError(0, 'Não foi possível falar com a API. Ela está rodando?')
  }

  // Cuidado: fetch NÃO lança exceção em 404 ou 500 — para ele,
  // receber uma resposta já é sucesso. Quem transforma status
  // ruim em erro somos nós.
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  // 204 No Content não tem corpo; .json() estouraria.
  if (response.status === 204) return null

  return response.json()
}
