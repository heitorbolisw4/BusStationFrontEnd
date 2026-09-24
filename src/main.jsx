import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider'

// BrowserRouter: URLs "de verdade" (/entrar), sem #. Em produção isso
// exige que o servidor devolva o index.html para qualquer caminho — é o
// rewrite do vercel.json. Sem ele, recarregar /entrar daria 404.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
