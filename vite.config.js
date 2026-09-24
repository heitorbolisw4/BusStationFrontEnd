import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// O .env.development só é lido no `npm run dev`. No build de produção a
// URL tem que vir do ambiente (painel do Vercel, ou env do CI). Sem esta
// checagem, esquecer a variável gera um bundle que chama "undefined/cities"
// — e o erro só aparece no navegador de quem abrir o site.
//
// Precisa ser URL absoluta https e alcançável pelo NAVEGADOR do usuário:
// - sem "https://", o fetch trata o valor como caminho relativo e bate no
//   próprio Vercel (404);
// - hosts de rede privada (*.railway.internal, *.internal) só existem
//   dentro do provedor — o navegador não resolve.
// Os dois casos já aconteceram no primeiro deploy.
function findApiUrlProblem(url) {
  if (!url) return 'está vazia'

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return 'não é uma URL absoluta (faltou o "https://"?)'
  }

  if (parsed.protocol !== 'https:') return 'precisa começar com https://'
  if (/^(localhost|127\.0\.0\.1)$/.test(parsed.hostname)) return 'aponta para localhost'
  if (parsed.hostname.endsWith('.internal')) {
    return 'é um host de rede privada, inacessível pelo navegador — use o domínio público'
  }
  if (url.endsWith('/')) return 'não pode terminar com "/" (o código já monta "/cities/list")'
  return null
}

function assertProductionApiUrl(command, mode) {
  if (command !== 'build' || mode !== 'production') return

  const url = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL
  const problem = findApiUrlProblem(url)
  if (problem) {
    throw new Error(
      `VITE_API_URL inválida para build de produção: "${url ?? ''}" ${problem}. ` +
        'Defina a URL pública da API (ex.: nas Environment Variables do Vercel).',
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  assertProductionApiUrl(command, mode)

  return {
    plugins: [react()],
    server: {
      // Fixo em 5173 porque é a origem liberada no CORS da API.
      // strictPort faz o Vite falhar se a porta estiver ocupada, em vez
      // de subir na 5174 — o que quebraria o CORS de um jeito confuso.
      port: 5173,
      strictPort: true,
    },
    // Config do Vitest mora aqui mesmo: ele reaproveita os plugins do Vite
    // (JSX, CSS Modules), então o teste compila o código igual ao navegador.
    test: {
      // jsdom simula DOM/window no Node — sem ele, render() não tem onde desenhar.
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      // A URL da API nos testes é fixa e falsa: nenhum teste unitário pode
      // depender de uma API de verdade rodando.
      env: { VITE_API_URL: 'http://api.test' },
      coverage: {
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/main.jsx', 'src/test/**', 'src/data/**'],
      },
    },
  }
})
