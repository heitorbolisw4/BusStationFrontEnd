/* =========================================================
   Token JWT no navegador.

   O front NÃO valida o token — quem valida (assinatura, emissor)
   é a API. Aqui só lemos o `exp` do payload para saber quando a
   sessão acaba, sem precisar esperar um 401 para descobrir.

   Onde guardar: localStorage sobrevive a recarregar a página, mas
   qualquer script rodando no site consegue lê-lo (risco de XSS).
   A alternativa segura é cookie HttpOnly, que exige mudança na API.
   Para o projeto de estudo, localStorage + expiração curta basta.
   ========================================================= */

const STORAGE_KEY = 'busstation.token'

// Devolve o instante de expiração em milissegundos, ou null se o token
// não tiver formato de JWT. Um JWT é "header.payload.assinatura", e o
// payload é JSON em base64url (base64 com - e _ no lugar de + e /).
export function getTokenExpiry(token) {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(base64))
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

export function isTokenValid(token, now = Date.now()) {
  if (!token) return false
  const expiry = getTokenExpiry(token)
  return expiry !== null && expiry > now
}

// Acesso ao storage sempre dentro de try: em aba anônima ou com
// cookies bloqueados, o navegador pode lançar exceção só de tocar nele.
export function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Sem storage a sessão só dura até recarregar a página. Aceitável.
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // idem
  }
}
