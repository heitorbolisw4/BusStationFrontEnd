import { Link } from 'react-router'
import styles from '../Auth/Auth.module.css'

// Com o rewrite do vercel.json, toda URL desconhecida chega no React —
// quem responde "não existe" passa a ser esta rota, e não o servidor.
function NotFound() {
  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Erro 404</p>
        <h1 className={styles.title}>Esta plataforma não existe</h1>
        <p className={styles.switch}>
          <Link to="/">Voltar para a busca de horários</Link>
        </p>
      </div>
    </section>
  )
}

export default NotFound
