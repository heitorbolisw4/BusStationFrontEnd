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
})
