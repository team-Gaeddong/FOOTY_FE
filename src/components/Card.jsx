import styles from './Card.module.css'

// tone: 'default'(gray-800) | 'deep'(gray-950, 경기 상단 정보·로그인 왼쪽 면)
// radius: 'md'(12px) | 'xl'(24px, 경기 상단 정보·홈 배너)
// padded: 안쪽 여백(모바일 16px, PC 24px)
export function Card({
  as: Tag = 'div',
  tone = 'default',
  radius = 'md',
  padded = true,
  className = '',
  ...props
}) {
  const classes = [styles.card, styles[tone], styles[radius], padded && styles.padded, className]
  return <Tag className={classes.filter(Boolean).join(' ')} {...props} />
}
