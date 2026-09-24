import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Adiciona matchers de DOM ao expect: toBeInTheDocument, toBeDisabled...
import '@testing-library/jest-dom/vitest'

// Fuso fixo: o site é para o Triângulo Mineiro, e bug de data depende
// de fuso. Sem isto, um teste passaria na sua máquina e falharia num
// CI rodando em UTC (ou o contrário).
process.env.TZ = 'America/Sao_Paulo'

// Desmonta o que cada teste renderizou, para um não vazar no próximo.
afterEach(() => {
  cleanup()
})
