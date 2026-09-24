import { Link } from 'react-router'
import { formatPrice, hourAndMinute } from '../../utils/format'
import styles from './DepartureBoard.module.css'

function seatsLabel(seats) {
  if (seats <= 0) return 'Esgotado'
  return `${seats} ${seats === 1 ? 'vaga' : 'vagas'}`
}

// O componente não busca nem compra nada: recebe o resultado pronto, o
// estado da busca e o estado da compra. Quem chama a API é a Home. Assim
// este arquivo continua sendo só "como isto aparece na tela", e dá para
// testá-lo sem servidor.
//
// `purchase` descreve a compra em andamento (no máximo uma por vez):
//   { boardingId, status: 'confirming' | 'buying' | 'done' | 'error', message? }
// `onBuy` / `onConfirm` / `onCancel` avisam a Home do clique. Sem `onBuy`,
// o painel é só leitura (sem coluna de ação).
function DepartureBoard({
  departures,
  status,
  errorMessage,
  loadingMessage = 'Procurando saídas…',
  purchase = null,
  onBuy,
  onConfirm,
  onCancel,
}) {
  function renderAction(departure) {
    const time = hourAndMinute(departure.boardingTime)
    const isThisRow = purchase?.boardingId === departure.boardingId

    if (isThisRow && purchase.status === 'confirming') {
      // Confirmação em dois cliques: ainda não existe cancelamento de
      // passagem na API, então compra errada não tem volta.
      return (
        <div className={styles.actions}>
          <button type="button" className={styles.buy} onClick={() => onConfirm(departure)}>
            Confirmar {formatPrice(departure.price)}
          </button>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      )
    }

    if (isThisRow && purchase.status === 'buying') {
      return (
        <button type="button" className={styles.buy} disabled>
          Comprando…
        </button>
      )
    }

    if (isThisRow && purchase.status === 'done') {
      return <span className={styles.bought}>Comprada ✓</span>
    }

    return (
      <button
        type="button"
        className={styles.buy}
        onClick={() => onBuy(departure)}
        // Uma compra por vez: enquanto uma está no ar, as outras esperam.
        disabled={departure.seats <= 0 || purchase?.status === 'buying'}
        // Vários botões "Comprar" iguais na tela: o aria-label diz ao
        // leitor de tela QUAL saída cada um compra.
        aria-label={`Comprar passagem das ${time}`}
      >
        Comprar
      </button>
    )
  }

  function renderFeedback(departure) {
    if (purchase?.boardingId !== departure.boardingId) return null

    if (purchase.status === 'done') {
      return (
        <p className={styles.feedback} role="status">
          Passagem comprada! <Link to="/minhas-passagens">Ver minhas passagens</Link>
        </p>
      )
    }

    if (purchase.status === 'error') {
      return (
        <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
          {purchase.message}
        </p>
      )
    }

    return null
  }

  function renderBody() {
    if (status === 'idle') {
      return (
        <p className={styles.state}>
          Escolha origem, destino e data acima para ver os horários.
        </p>
      )
    }

    if (status === 'loading') {
      return (
        <p className={styles.state} role="status">
          {loadingMessage}
        </p>
      )
    }

    if (status === 'error') {
      return (
        <p className={`${styles.state} ${styles.stateError}`} role="alert">
          {errorMessage}
        </p>
      )
    }

    // Busca que não achou nada não é erro: a API respondeu 200 com [].
    if (departures.length === 0) {
      return (
        <p className={styles.state}>
          Nenhuma saída para esse trecho na data escolhida.
        </p>
      )
    }

    return (
      <ul className={styles.board}>
        {departures.map((departure) => {
          const isLow = departure.seats <= 5

          return (
            // key precisa ser estável e única dentro da lista: é como o
            // React sabe que a linha 3 continua sendo a mesma linha 3
            // depois de uma nova busca. Índice do array não serve.
            <li
              key={departure.boardingId}
              className={onBuy ? `${styles.row} ${styles.rowWithAction}` : styles.row}
            >
              {/* O valor cru ("05:40:00") vai no atributo dateTime, que é
                  para leitor de tela e robô; o texto é para humano. */}
              <time className={styles.time} dateTime={departure.boardingTime}>
                {hourAndMinute(departure.boardingTime)}
              </time>

              <div className={styles.leg}>
                <span className={styles.codes}>
                  {departure.originAcronym}
                  <span className={styles.arrow}>→</span>
                  {departure.destinationAcronym}
                </span>
                <span className={styles.meta}>
                  {departure.originCity} para {departure.destinationCity} ·{' '}
                  {departure.kilometers} km
                </span>
              </div>

              <span
                className={
                  isLow ? `${styles.seats} ${styles.seatsLow}` : styles.seats
                }
              >
                {seatsLabel(departure.seats)}
              </span>

              <span className={styles.price}>{formatPrice(departure.price)}</span>

              {onBuy && <div className={styles.action}>{renderAction(departure)}</div>}

              {renderFeedback(departure)}
            </li>
          )
        })}
      </ul>
    )
  }

  const found = status === 'ready' && departures.length > 0

  return (
    <section className={styles.section} id="saidas">
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>Saídas</h2>
          <p className={styles.sub}>
            {found
              ? `${departures.length} ${departures.length === 1 ? 'saída encontrada' : 'saídas encontradas'}. As vagas caem conforme as passagens são vendidas.`
              : 'As vagas caem conforme as passagens são vendidas.'}
          </p>
        </div>

        {renderBody()}
      </div>
    </section>
  )
}

export default DepartureBoard
