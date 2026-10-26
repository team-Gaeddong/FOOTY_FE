import styles from './Button.module.css'

// variant: 'primary' | 'secondary' | 'danger'
export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
