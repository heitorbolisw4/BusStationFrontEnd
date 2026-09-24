import styles from './DepartureBoard.module.css'

// Criado uma vez só, fora do componente: formatador de moeda do navegador.
const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// A API manda TimeOnly como "05:40:00". O painel só quer hora e minuto —
// mas o valor cru continua indo no atributo dateTime do <time>, que é
// para leitor de tela e robô, não para humano.
function hourAndMinute(time) {
  return time.slice(0, 5)
}

// O componente não busca nada: recebe o resultado pronto e o estado da
// busca. Quem chama a API é a Home. Assim este arquivo continua sendo
// só "como isto aparece na tela", e dá para testá-lo sem servidor.
function DepartureBoard({ departures, status, errorMessage }) {
  function renderBody() {
    if (status === 'idle') {
      return (
        <p className={styles.state}>
          Escolha origem, destino e data acima para ver os horários.
        </p>
      )
    }

    if (status === 'loading') {
      return <p className={styles.state}>Procurando saídas…</p>
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
            <li key={departure.boardingId} className={styles.row}>
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
                {departure.seats} {departure.seats === 1 ? 'vaga' : 'vagas'}
              </span>

              <span className={styles.price}>{brl.format(departure.price)}</span>
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
