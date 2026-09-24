import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { AuthContext } from './auth-context'
import {
  clearStoredToken,
  getTokenExpiry,
  isTokenValid,
  readStoredToken,
  storeToken,
} from './token'

// Lido uma vez, na montagem: token salvo e ainda no prazo vira sessão
// "checking" (falta buscar o perfil); vencido ou ausente é apagado.
function initialState() {
  const stored = readStoredToken()
  if (isTokenValid(stored)) {
    return { status: 'checking', token: stored, user: null, sessionExpired: false }
  }
  clearStoredToken()
  return { status: 'anonymous', token: null, user: null, sessionExpired: false }
}

const ANONYMOUS = { status: 'anonymous', token: null, user: null, sessionExpired: false }

function AuthProvider({ children }) {
  // Um objeto só: token, usuário e status mudam sempre juntos. Com
  // useStates separados daria para existir "status logado sem token".
  const [session, setSession] = useState(initialState)

  const logout = useCallback(() => {
    clearStoredToken()
    setSession(ANONYMOUS)
  }, [])

  // Sessão que acabou sozinha (prazo do token): igual ao logout, mas
  // marca o motivo para a tela de login explicar o que aconteceu.
  const expireSession = useCallback(() => {
    clearStoredToken()
    setSession({ ...ANONYMOUS, sessionExpired: true })
  }, [])

  // Recarregou a página com token salvo: busca o perfil para ter o nome.
  useEffect(() => {
    if (session.status !== 'checking') return
    let ignore = false

    authApi
      .getProfile(session.token)
      .then((user) => {
        if (!ignore) setSession((s) => ({ ...s, status: 'authenticated', user }))
      })
      .catch((error) => {
        if (ignore) return
        if (error.status === 401) {
          expireSession()
        } else {
          // API fora do ar / cold start: o token ainda vale, então a
          // sessão continua — só fica sem nome para mostrar.
          setSession((s) => ({ ...s, status: 'authenticated' }))
        }
      })

    return () => {
      ignore = true
    }
  }, [session.status, session.token, expireSession])

  // Logout automático no instante em que o token vence. A API recusa
  // token vencido sem tolerância (ClockSkew = 0), então esperar o 401
  // deixaria o usuário clicar em "comprar" e só aí descobrir.
  useEffect(() => {
    if (!session.token) return
    const expiry = getTokenExpiry(session.token)
    if (expiry === null) return

    const timer = setTimeout(expireSession, Math.max(0, expiry - Date.now()))
    return () => clearTimeout(timer)
  }, [session.token, expireSession])

  const login = useCallback(async ({ email, password }) => {
    const token = await authApi.login({ email, password })
    const user = await authApi.getProfile(token)
    storeToken(token)
    setSession({ status: 'authenticated', token, user, sessionExpired: false })
    return user
  }, [])

  // A API não devolve token no cadastro (201 sem corpo), então logamos
  // em seguida com as mesmas credenciais — o usuário não digita duas vezes.
  const register = useCallback(
    async (data) => {
      await authApi.register(data)
      return login({ email: data.email, password: data.password })
    },
    [login],
  )

  // useMemo: sem ele, o objeto seria novo a cada render e TODO componente
  // que usa useAuth renderizaria de novo mesmo sem nada ter mudado.
  const value = useMemo(
    () => ({ ...session, login, logout, register, expireSession }),
    [session, login, logout, register, expireSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
