import { Link } from 'react-router'
import { useAuth } from '../../auth/auth-context'
import styles from './Header.module.css'

// Fica fora do componente de propósito: é uma constante, não muda
// entre renders. Se estivesse dentro, o array seria recriado do zero
// toda vez que o componente renderizasse.
//
// "/#saidas" (e não só "#saidas"): com rotas, o Header também aparece
// em /entrar, e lá "#saidas" apontaria para uma âncora que não existe.
const NAV_LINKS = [
  { label: 'Horários', href: '/#saidas' },
  { label: 'Rotas', href: '/#rotas' },
  { label: 'Ajuda', href: '/#ajuda' },
]

// Só o primeiro nome: "Olá, Maria" cabe no header; o nome completo não.
function firstName(name) {
  return name.trim().split(/\s+/)[0]
}

function Header() {
  const { status, user, logout } = useAuth()

  function renderAccount() {
    // Enquanto confere o token salvo, não mostra nada: evita piscar
    // "Entrar" por meio segundo para quem já está logado.
    if (status === 'checking') return null

    if (status === 'authenticated') {
      return (
        <div className={styles.account}>
          <span className={styles.greeting}>
            {user ? `Olá, ${firstName(user.name)}` : 'Minha conta'}
          </span>
          <button type="button" className={styles.login} onClick={logout}>
            Sair
          </button>
        </div>
      )
    }

    return (
      // <Link> troca de página sem recarregar o site; <a href> recarregaria
      // tudo e perderia o estado do React.
      <Link className={styles.login} to="/entrar">
        Entrar
      </Link>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} to="/">
          <span className={styles.mark}>BST</span>
          <span className={styles.word}>BusStation</span>
        </Link>

        <nav aria-label="Navegação principal">
          <ul className={styles.links}>
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <a className={styles.link} href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {renderAccount()}
      </div>
    </header>
  )
}

export default Header
