import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { listTickets } from '../../api/tickets'
import { useAuth } from '../../auth/auth-context'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import { boardingDateTime, formatDateOnly, formatPrice, hourAndMinute } from '../../utils/format'
import styles from './Tickets.module.css'

// A API não garante ordem. Próximas primeiro (a mais perto no topo),
// depois as que já passaram (a mais recente no topo).
function splitAndSort(tickets, now) {
  const withTime = tickets.map((ticket) => ({
    ticket,
    at: boardingDateTime(ticket.boardingDate, ticket.boardingTime),
  }))
  const upcoming = withTime.filter((t) => t.at >= now).sort((a, b) => a.at - b.at)
  const past = withTime.filter((t) => t.at < now).sort((a, b) => b.at - a.at)
  return { upcoming: upcoming.map((t) => t.ticket), past: past.map((t) => t.ticket) }
}

function TicketCard({ ticket, past }) {
  return (
    <li className={past ? `${styles.ticket} ${styles.ticketPast}` : styles.ticket}>
      <div className={styles.when}>
        <time className={styles.time} dateTime={ticket.boardingTime}>
          {hourAndMinute(ticket.boardingTime)}
        </time>
        <time className={styles.date} dateTime={ticket.boardingDate}>
          {formatDateOnly(ticket.boardingDate)}
        </time>
      </div>

      <div className={styles.route}>
        <span className={styles.routeName}>{ticket.routeName || 'Rota sem nome'}</span>
        <span className={styles.code}>Passagem nº {ticket.id}</span>
      </div>

      <span className={styles.fare}>{formatPrice(ticket.farePaid)}</span>
    </li>
  )
}

function Tickets() {
  const { status: authStatus, request } = useAuth()
  const navigate = useNavigate()

  const [tickets, setTickets] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const slow = useSlowFlag(status === 'loading')

  useEffect(() => {
    // Só busca com sessão confirmada. Em "checking" o AuthProvider ainda
    // está trocando o refresh token; "anonymous" é redirecionado abaixo.
    if (authStatus !== 'authenticated') return
    let ignore = false
    setStatus('loading')

    request(listTickets)
      .then((data) => {
        if (ignore) return
        setTickets(data)
        setStatus('ready')
      })
      .catch((error) => {
        if (ignore) return
        if (error.status === 401) {
          navigate('/entrar', { state: { from: '/minhas-passagens' }, replace: true })
          return
        }
        setErrorMessage(error.message)
        setStatus('error')
      })

    return () => {
      ignore = true
    }
  }, [authStatus, request, navigate, attempt])

  // Rota protegida: sem sessão, manda para o login e volta para cá depois.
  if (authStatus === 'anonymous') {
    return <Navigate to="/entrar" state={{ from: '/minhas-passagens' }} replace />
  }

  function renderBody() {
    if (authStatus === 'checking' || status === 'loading') {
      return (
        <p className={styles.state} role="status">
          {slow
            ? 'O servidor está acordando — pode levar até 1 minuto.'
            : 'Carregando suas passagens…'}
        </p>
      )
    }

    if (status === 'error') {
      return (
        <div className={styles.state} role="alert">
          <p>{errorMessage}</p>
          <button type="button" className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
            Tentar de novo
          </button>
        </div>
      )
    }

    if (tickets.length === 0) {
      return (
        <div className={styles.state}>
          <p>Você ainda não comprou nenhuma passagem.</p>
          <Link className={styles.cta} to="/">
            Buscar horários
          </Link>
        </div>
      )
    }

    const { upcoming, past } = splitAndSort(tickets, new Date())

    return (
      <>
        {upcoming.length > 0 && (
          <section aria-labelledby="proximas">
            <h2 id="proximas" className={styles.groupTitle}>
              Próximas viagens
            </h2>
            <ul className={styles.list}>
              {upcoming.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section aria-labelledby="anteriores">
            <h2 id="anteriores" className={styles.groupTitle}>
              Viagens anteriores
            </h2>
            <ul className={styles.list}>
              {past.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} past />
              ))}
            </ul>
          </section>
        )}
      </>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Minhas passagens</h1>
        {renderBody()}
      </div>
    </section>
  )
}

export default Tickets
