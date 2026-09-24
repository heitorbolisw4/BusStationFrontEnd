import { useEffect, useState } from 'react'

/* Vira true quando `active` passa de `delayMs` ligado sem desligar.

   Existe por causa do cold start: no plano free, a API (Render) e o
   banco (Neon) hibernam, e a primeira requisição pode levar ~1 minuto.
   "Carregando…" parado por um minuto parece site travado — depois de
   alguns segundos, a tela troca para uma explicação.

   Quando `active` desliga, o timer é cancelado e o valor volta a false
   no próximo ciclo em que ligar. */
export function useSlowFlag(active, delayMs = 5000) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!active) return

    const timer = setTimeout(() => setSlow(true), delayMs)

    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [active, delayMs])

  return active && slow
}
