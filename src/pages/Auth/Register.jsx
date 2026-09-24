import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import TextField from '../../components/TextField/TextField'
import { useAuth } from '../../auth/auth-context'
import { MIN_AGE, MIN_PASSWORD_LENGTH, validateRegistration } from '../../auth/validation'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import styles from './Auth.module.css'

const EMPTY_FORM = { name: '', email: '', password: '', age: '' }

function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  // Um objeto para o formulário inteiro: quatro campos com a mesma
  // lógica de mudança não justificam quatro useStates.
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlowFlag(submitting)

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  // Um handler para todos os campos: o `name` do input diz qual chave mudar.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const found = validateRegistration(form)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        age: Number(form.age), // o C# espera int
      })
      navigate(from, { replace: true })
    } catch (error) {
      if (error.status === 409) {
        // Erro de um campo específico: aparece embaixo do campo.
        setErrors({ email: 'Já existe uma conta com esse e-mail.' })
      } else {
        setFormError(error.message)
      }
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Sua conta</p>
        <h1 className={styles.title}>Criar conta</h1>

        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <TextField
            label="Nome"
            name="name"
            autoComplete="name"
            value={form.name}
            error={errors.name}
            onChange={handleChange}
          />

          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            error={errors.email}
            onChange={handleChange}
          />

          <TextField
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
            onChange={handleChange}
          />

          <TextField
            label="Idade"
            name="age"
            type="number"
            inputMode="numeric"
            min={MIN_AGE}
            value={form.age}
            error={errors.age}
            onChange={handleChange}
          />

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Criando conta…' : 'Criar conta'}
          </button>

          {slow && (
            <p className={styles.slow} role="status">
              O servidor está acordando — pode levar até 1 minuto.
            </p>
          )}
        </form>

        <p className={styles.switch}>
          Já tem conta?{' '}
          <Link to="/entrar" state={{ from }}>
            Entrar
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Register
