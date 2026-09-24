import { useState } from 'react'
import { todayISO } from '../../utils/date'
import styles from './SearchCard.module.css'

// `onSearch` é uma função que vem de fora. O card não sabe (nem quer saber)
// o que acontece com a busca — ele só avisa "o usuário pediu isto".
// Quem decide o que fazer é a Home, que é dona do resultado.
// Valor inicial de um select: o salvo, se a cidade ainda existir na lista;
// senão, a cidade na posição `fallbackIndex`.
function initialCityId(cities, savedId, fallbackIndex) {
  const exists = cities.some((city) => city.id === savedId)
  return String(exists ? savedId : cities[fallbackIndex].id)
}

// `initialValues` (opcional) pré-preenche o formulário — é como a Home
// devolve a última busca depois que o usuário volta do login.
function SearchCard({ cities, onSearch, isSearching, initialValues }) {
  // useState devolve um par: [valor atual, função que troca o valor].
  // Trocar o valor é o que faz o React redesenhar a tela.
  //
  // O argumento aqui é só o valor INICIAL — lido no primeiro render e
  // ignorado nos seguintes. Por isso a Home só monta este componente
  // depois que as cidades chegaram: se montasse antes, o valor inicial
  // seria vazio e nunca se corrigiria sozinho.
  const [originId, setOriginId] = useState(() =>
    initialCityId(cities, initialValues?.originCityId, 0),
  )
  const [destinationId, setDestinationId] = useState(() =>
    initialCityId(cities, initialValues?.destinationCityId, 1),
  )
  const [date, setDate] = useState(() => initialValues?.date ?? todayISO())

  // Valor derivado: não precisa de state próprio, é só uma conta
  // feita a cada render em cima do state que já existe.
  const sameCity = originId === destinationId

  function handleSwap() {
    // originId e destinationId aqui são os valores DESTE render,
    // então a troca cruzada funciona sem variável temporária.
    setOriginId(destinationId)
    setDestinationId(originId)
  }

  function handleSubmit(event) {
    // Sem isso o navegador recarrega a página inteira ao enviar o form.
    event.preventDefault()
    if (sameCity || isSearching) return

    // O value de um <select> é sempre string — o C# espera int na query.
    // A conversão mora aqui, na fronteira, e não espalhada pelo resto.
    onSearch({
      originCityId: Number(originId),
      destinationCityId: Number(destinationId),
      date,
    })
  }

  return (
    <form className={styles.ticket} onSubmit={handleSubmit}>
      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.label}>Origem</span>
          <select
            className={`${styles.control} ${styles.select}`}
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
          >
            {cities.map((city) => (
              <option key={city.id} value={String(city.id)}>
                {city.cityName} · {city.state}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.swap}
          onClick={handleSwap}
          aria-label="Inverter origem e destino"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M3 7h11M11 4l3 3-3 3M17 13H6m3-3-3 3 3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <label className={styles.field}>
          <span className={styles.label}>Destino</span>
          <select
            className={`${styles.control} ${styles.select}`}
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
          >
            {cities.map((city) => (
              <option key={city.id} value={String(city.id)}>
                {city.cityName} · {city.state}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Data da ida</span>
          <input
            className={styles.control}
            type="date"
            value={date}
            min={todayISO()}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={sameCity || isSearching}
        >
          {isSearching ? 'Buscando…' : 'Buscar horários'}
        </button>

        {/* Renderização condicional: se sameCity for false, o React
            não desenha nada. */}
        {sameCity && (
          <p className={styles.hint} role="alert">
            Origem e destino são a mesma cidade. Escolha cidades diferentes.
          </p>
        )}
      </div>

      {/* Serrilha do bilhete — puro CSS, sem imagem */}
      <div className={styles.perforation} aria-hidden="true" />
    </form>
  )
}

export default SearchCard
