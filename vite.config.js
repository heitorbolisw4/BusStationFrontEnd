import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
})
