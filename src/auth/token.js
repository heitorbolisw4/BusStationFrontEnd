/* =========================================================
   Onde cada token mora no navegador.

   - Token de ACESSO (vale ~15 min): só em memória, dentro do
     AuthProvider. Some ao recarregar a página — de propósito.
   - REFRESH token (vale dias): localStorage, para a sessão sobreviver
     a recarregar/fechar a aba. Ao abrir o site, ele é trocado por um
     token de acesso novo em POST /refresh.

   Risco conhecido: qualquer script rodando no site lê o localStorage
   (XSS). O ideal seria cookie HttpOnly, mas cookie entre vercel.app e
   railway.app é bloqueado como "de terceiros" pelos navegadores.
   Decisão registrada no ARCHITECTURE §7 da API; aceito para staging.
   ========================================================= */

const STORAGE_KEY = 'busstation.refreshToken'

// Acesso ao storage sempre dentro de try: em aba anônima ou com
// cookies bloqueados, o navegador pode lançar exceção só de tocar nele.
export function readStoredRefreshToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeRefreshToken(refreshToken) {
  try {
    // API antiga não manda refresh token: não há o que guardar.
    if (refreshToken) localStorage.setItem(STORAGE_KEY, refreshToken)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem storage a sessão só dura até recarregar a página. Aceitável.
  }
}

export function clearStoredRefreshToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // idem
  }
}
