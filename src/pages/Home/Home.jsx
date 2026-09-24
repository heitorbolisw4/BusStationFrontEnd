import { useEffect, useRef, useState } from 'react'
import SearchCard from '../../components/SearchCard/SearchCard'
import DepartureBoard from '../../components/DepartureBoard/DepartureBoard'
import { listCities } from '../../api/cities'
import { searchBoardings } from '../../api/boardings'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import styles from './Home.module.css'

const SLOW_MESSAGE =
  'O servidor está acordando — a primeira consulta do dia pode levar até 1 minuto.'

function Home() {
  const [cities, setCities] = useState([])
  // Um estado só, com valores excludentes, em vez de três booleanos
  // soltos: assim é impossível estar "carregando e com erro" ao mesmo tempo.
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  // Mudar este número é o que faz o efeito rodar de novo (botão "tentar de novo").
  const [attempt, setAttempt] = useState(0)

  // Estado da BUSCA, separado do estado das cidades: são duas requisições
  // independentes, e uma falhando não deve apagar o resultado da outra.
  const [departures, setDepartures] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle') // idle | loading | ready | error
  const [searchError, setSearchError] = useState('')

  // useRef guarda um valor entre renders SEM causar re-render quando muda —
  // é o lugar certo para controle interno que a tela não exibe.
  const searchIdRef = useRef(0)

  // Cold start da API em staging: depois de alguns segundos em "carregando",
  // a tela explica a demora em vez de parecer travada.
  const citiesSlow = useSlowFlag(status === 'loading')
  const searchSlow = useSlowFlag(searchStatus === 'loading')

  useEffect(() => {
    // Trava contra resposta atrasada: se o componente sair da tela
    // (ou o efeito rodar de novo) antes da API responder, ignoramos
    // o resultado em vez de gravar em um state que não existe mais.
    let ignore = false

    setStatus('loading')

    listCities()
      .then((data) => {
        if (ignore) return
        setCities(data)
        setStatus('ready')
      })
      .catch((error) => {
        if (ignore) return
        setErrorMessage(error.message)
        setStatus('error')
      })

    // Função de limpeza: o React chama antes de rodar o efeito de novo
    // e quando o componente é desmontado.
    return () => {
      ignore = true
    }
  }, [attempt]) // roda no primeiro render e sempre que `attempt` mudar

  // Repare que esta busca NÃO está num useEffect. useEffect existe para
  // sincronizar o componente com algo externo quando ele renderiza — como
  // as cidades, que precisam chegar sozinhas assim que a tela abre.
  // Aqui a causa é um clique do usuário, e clique se resolve no próprio
  // handler. Enfiar isto num efeito seria dar a volta ao mundo.
  function handleSearch(params) {
    // Duas buscas rápidas podem voltar fora de ordem: a segunda responde
    // antes da primeira, e a resposta velha sobrescreve a nova na tela.
    // Cada busca ganha um número; quando a resposta chega, só é aceita
    // se ainda for a busca mais recente.
    const requestId = searchIdRef.current + 1
    searchIdRef.current = requestId

    setSearchStatus('loading')

    searchBoardings(params)
      .then((data) => {
        if (requestId !== searchIdRef.current) return
        setDepartures(data)
        setSearchStatus('ready')
      })
      .catch((error) => {
        if (requestId !== searchIdRef.current) return
        setSearchError(error.message)
        setSearchStatus('error')
      })
  }

  // JSX é só um valor — dá para montá-lo numa função e devolver.
  // Evita ternário aninhado no meio da marcação.
  function renderSearchArea() {
    if (status === 'loading') {
      return (
        // role="status" faz o leitor de tela anunciar quando o texto muda.
        <p className={styles.slotCard} role="status">
          {citiesSlow ? SLOW_MESSAGE : 'Carregando cidades…'}
        </p>
      )
    }

    if (status === 'error') {
      return (
        <div className={styles.slotCard} role="alert">
          <p className={styles.slotText}>{errorMessage}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => setAttempt(attempt + 1)}
          >
            Tentar de novo
          </button>
        </div>
      )
    }

    if (cities.length < 2) {
      return (
        <div className={styles.slotCard}>
          <p className={styles.slotText}>
            A busca precisa de pelo menos duas cidades. Cadastre em
            <code className={styles.code}>POST /cities/create</code>.
          </p>
        </div>
      )
    }

    return (
      <SearchCard
        cities={cities}
        onSearch={handleSearch}
        isSearching={searchStatus === 'loading'}
      />
    )
  }

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>
            Triângulo Mineiro
            {status === 'ready' && ` · ${cities.length} cidades`}
          </p>

          <h1 className={styles.title}>
            Passagem de ônibus <em>sem fila no guichê</em>
          </h1>

          <p className={styles.lead}>
            Escolha origem, destino e data para ver os horários do dia. A poltrona
            fica reservada assim que o pagamento é confirmado.
          </p>

          <div className={styles.searchSlot}>{renderSearchArea()}</div>
        </div>
      </section>

      <DepartureBoard
        departures={departures}
        status={searchStatus}
        errorMessage={searchError}
        loadingMessage={searchSlow ? SLOW_MESSAGE : undefined}
      />
    </>
  )
}

export default Home
