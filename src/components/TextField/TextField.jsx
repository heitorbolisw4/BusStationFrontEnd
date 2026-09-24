import { useId } from 'react'
import styles from './TextField.module.css'

// Label + input + mensagem de erro, ligados do jeito que leitor de tela
// entende: aria-invalid marca o campo e aria-describedby aponta para o
// texto do erro, que é lido junto quando o campo recebe foco.
function TextField({ label, error, hint, ...inputProps }) {
  // useId gera um id único e estável — dois formulários na mesma página
  // não colidem, e o valor é o mesmo no servidor e no navegador.
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? `${styles.input} ${styles.inputError}` : styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message && (
        <p id={messageId} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  )
}

export default TextField
