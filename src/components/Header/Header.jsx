import styles from './Header.module.css'

// Fica fora do componente de propósito: é uma constante, não muda
// entre renders. Se estivesse dentro, o array seria recriado do zero
// toda vez que o componente renderizasse.
const NAV_LINKS = [
  { label: 'Horários', href: '#saidas' },
  { label: 'Rotas', href: '#rotas' },
  { label: 'Ajuda', href: '#ajuda' },
]

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/">
          <span className={styles.mark}>BST</span>
          <span className={styles.word}>BusStation</span>
        </a>

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

        <a className={styles.login} href="#entrar">
          Entrar
        </a>
      </div>
    </header>
  )
}

export default Header
