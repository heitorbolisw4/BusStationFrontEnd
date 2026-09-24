import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import Home from './pages/Home/Home'

// App é o "layout": tudo que aparece em toda página do site.
// Hoje o miolo é fixo na Home; quando entrar o roteador, é só
// esse <Home /> que passa a trocar conforme a URL.
function App() {
  return (
    <>
      <Header />
      <main>
        <Home />
      </main>
      <Footer />
    </>
  )
}

export default App
