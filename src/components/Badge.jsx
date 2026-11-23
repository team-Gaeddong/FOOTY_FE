import styles from './Badge.module.css'

// tone: 'green'(모집 중) | 'navy'(팀 확정) | 'gray'(경기 종료) | 'red'(경고·미입력)
//       | 'brand'(나) | 'deep'(파티장·내가 만든 경기, 가장 깊은 면)
export function Badge({ tone = 'green', className = '', children, ...props }) {
  return (
    <span className={[styles.badge, styles[tone], className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  )
}
