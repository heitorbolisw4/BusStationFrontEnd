import { createContext, useContext } from 'react'

// Contexto resolve "prop drilling": Header, páginas de login e (em breve)
// a compra precisam saber quem está logado. Em vez de passar isso de
// pai para filho por cinco níveis, qualquer componente pede ao contexto.
export const AuthContext = createContext(null)

// Mora num arquivo .js separado do AuthProvider.jsx porque o Fast Refresh
// do Vite só funciona em arquivos que exportam apenas componentes.
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    // Erro alto e claro em vez de "cannot read property of null" lá na frente.
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  }
  return auth
}
