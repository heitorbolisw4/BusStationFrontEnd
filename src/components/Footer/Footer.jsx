import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <span className={styles.word}>BusStation</span>
          <p className={styles.note}>
            Linhas regulares no Triângulo Mineiro. Guichê aberto das 5h às 22h.
          </p>
        </div>

        <ul className={styles.links}>
          <li>
            <a href="/#saidas">Horários</a>
          </li>
          <li>
            <a href="/#rotas">Rotas</a>
          </li>
          <li>
            <a href="/#ajuda">Ajuda</a>
          </li>
        </ul>
      </div>

      <p className={styles.legal}>
        Projeto de estudo · {new Date().getFullYear()}
      </p>
    </footer>
  )
}

export default Footer
