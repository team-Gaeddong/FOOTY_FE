import styles from './ErrorMessage.module.css'

export function ErrorMessage({ children }) {
  if (!children) return null
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  )
}
