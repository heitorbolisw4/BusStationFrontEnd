import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '../api/auth'
import { ApiError } from '../api/client'
import { AuthContext } from './auth-context'
import {
  clearStoredRefreshToken,
  readStoredRefreshToken,
  storeRefreshToken,
  withRefreshLock,
} from './token'

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre de novo para continuar.'

const ANONYMOUS = { status: 'anonymous', user: null, sessionExpired: false }

// Tem refresh token salvo? Então ainda não sabemos se a sessão vale:
// "checking" até o /refresh responder. Sem ele, anônimo direto.
function initialSession() {
  return readStoredRefreshToken() ? { ...ANONYMOUS, status: 'checking' } : ANONYMOUS
}

function AuthProvider({ children }) {
  // O que a TELA precisa (status, nome do usuário) fica em state.
  const [session, setSession] = useState(initialSession)

  // O token de acesso fica em ref, não em state: quem precisa dele são
  // as requisições, na hora em que saem — não o desenho da tela. E ref
  // é lida sempre com o valor mais novo, sem esperar re-render.
  const accessTokenRef = useRef(null)

  // Single-flight: enquanto um /refresh está no ar, quem mais precisar
  // de token novo espera ESTA promise em vez de disparar outro refresh.
  // Dois refresh com o mesmo token = API revoga todas as sessões.
  const refreshInFlightRef = useRef(null)

  const applyTokens = useCallback(({ token, refreshToken }) => {
    accessTokenRef.current = token
    storeRefreshToken(refreshToken)
  }, [])

  const endSession = useCallback((expired) => {
    accessTokenRef.current = null
    clearStoredRefreshToken()
    setSession({ ...ANONYMOUS, sessionExpired: expired })
  }, [])

  // Duas camadas contra /refresh duplicado:
  // - refreshInFlightRef: várias chamadas NESTA aba dividem uma promise;
  // - withRefreshLock: entre abas, uma de cada vez. O token é lido DENTRO
  //   da trava e o novo é gravado antes de soltá-la, então a próxima aba
  //   já encontra o token rotacionado no storage.
  const refreshAccessToken = useCallback(() => {
    if (!refreshInFlightRef.current) {
      refreshInFlightRef.current = withRefreshLock(async () => {
        const refreshToken = readStoredRefreshToken()
        if (!refreshToken) throw new ApiError(401, 'Sem refresh token.')

        const pair = await authApi.refresh(refreshToken)
        applyTokens(pair)
        return pair.token
      }).finally(() => {
        refreshInFlightRef.current = null
      })
    }
    return refreshInFlightRef.current
  }, [applyTokens])

  /* Toda chamada autenticada passa por aqui. `call` recebe o token e
     faz a requisição: request((token) => listTickets(token)).

     401 → pede token novo (uma vez, compartilhado) e repete a chamada.
     Refresh recusado → sessão encerrada e o erro vira "sessão expirou". */
  const request = useCallback(
    async (call) => {
      let token = accessTokenRef.current
      if (!token) {
        try {
          token = await refreshAccessToken()
        } catch (error) {
          if (error.status === 401) endSession(true)
          throw error.status === 401 ? new ApiError(401, SESSION_EXPIRED_MESSAGE) : error
        }
      }

      try {
        return await call(token)
      } catch (error) {
        if (error.status !== 401) throw error

        // Outra requisição já trocou o token enquanto esta estava no ar:
        // basta repetir com o atual, sem gastar um refresh.
        if (accessTokenRef.current && accessTokenRef.current !== token) {
          return call(accessTokenRef.current)
        }

        let fresh
        try {
          fresh = await refreshAccessToken()
        } catch (refreshError) {
          if (refreshError.status !== 401) throw refreshError
          endSession(true)
          throw new ApiError(401, SESSION_EXPIRED_MESSAGE)
        }
        return call(fresh)
      }
    },
    [refreshAccessToken, endSession],
  )

  // Abriu o site com refresh token salvo: troca por um token de acesso
  // e busca o perfil. StrictMode roda efeitos duas vezes em dev — o
  // single-flight garante que isso NÃO vira dois /refresh.
  useEffect(() => {
    if (session.status !== 'checking') return
    let ignore = false

    request(authApi.getProfile)
      .then((user) => {
        if (!ignore) setSession({ status: 'authenticated', user, sessionExpired: false })
      })
      .catch((error) => {
        if (ignore || error.status === 401) return // 401 já encerrou a sessão
        // API fora do ar: não dá para saber se a sessão vale. Fica
        // deslogado na tela, mas o refresh token continua salvo para a
        // próxima visita tentar de novo.
        setSession(ANONYMOUS)
      })

    return () => {
      ignore = true
    }
  }, [session.status, request])

  const login = useCallback(
    async ({ email, password }) => {
      const pair = await authApi.login({ email, password })
      applyTokens(pair)
      const user = await authApi.getProfile(pair.token)
      setSession({ status: 'authenticated', user, sessionExpired: false })
      return user
    },
    [applyTokens],
  )

  // A API não devolve token no cadastro (201 sem corpo), então logamos
  // em seguida com as mesmas credenciais — o usuário não digita duas vezes.
  const register = useCallback(
    async (data) => {
      await authApi.register(data)
      return login({ email: data.email, password: data.password })
    },
    [login],
  )

  const logout = useCallback(() => {
    const refreshToken = readStoredRefreshToken()
    endSession(false)
    // Avisa a API para revogar o refresh token. Não espera a resposta:
    // do ponto de vista do usuário ele já saiu, e /logout sempre dá 204.
    if (refreshToken) authApi.logout(refreshToken).catch(() => {})
  }, [endSession])

  // useMemo: sem ele, o objeto seria novo a cada render e TODO componente
  // que usa useAuth renderizaria de novo mesmo sem nada ter mudado.
  const value = useMemo(
    () => ({ ...session, login, logout, register, request }),
    [session, login, logout, register, request],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
