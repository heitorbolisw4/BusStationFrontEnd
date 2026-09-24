import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import TextField from '../../components/TextField/TextField'
import { useAuth } from '../../auth/auth-context'
import { validateLogin } from '../../auth/validation'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import styles from './Auth.module.css'

function Login() {
  const { status, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Quem mandou o usuário para cá (ex.: a compra, no futuro) deixa em
  // `state.from` para onde voltar depois de entrar.
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlowFlag(submitting)

  // Já logado não tem o que fazer aqui. `replace` troca a entrada do
  // histórico: o "voltar" do navegador não traz de novo para /entrar.
  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const found = validateLogin({ email, password })
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (error) {
      // 401 vem sem corpo: a mensagem é nossa. A API não diz se o erro foi
      // no e-mail ou na senha — e a tela também não deve dizer.
      setFormError(error.status === 401 ? 'E-mail ou senha incorretos.' : error.message)
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Sua conta</p>
        <h1 className={styles.title}>Entrar</h1>

        {/* noValidate: desliga os balões nativos do navegador para as
            mensagens saírem todas no mesmo lugar e em português. */}
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          {sessionExpired && (
            <p className={styles.notice} role="status">
              Sua sessão expirou. Entre de novo para continuar.
            </p>
          )}

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>

          {slow && (
            <p className={styles.slow} role="status">
              O servidor está acordando — pode levar até 1 minuto.
            </p>
          )}
        </form>

        <p className={styles.switch}>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" state={{ from }}>
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login
