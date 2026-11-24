import styles from './Switch.module.css'

// 켜고 끄는 스위치(시안 PollNew). 한 줄 안내와 함께 쓰며, label은 화면 읽기용 이름이다.
export function Switch({ checked, onChange, label, className = '', ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={[styles.switch, className].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  )
}
