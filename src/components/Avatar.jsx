import { avatarInitial } from './avatarInitial.js'
import styles from './Avatar.module.css'

// size: 'md'(36px) | 'lg'(72px). 이미지 없이 이름의 첫 글자를 원에 보여 준다.
// tone: 'brand'(brand-green, 나) | 'neutral'(회색, 다른 선수)
// label이 있으면 스크린리더에 읽히고, 없으면 장식으로 숨긴다.
export function Avatar({ name, size = 'md', tone = 'brand', label, className = '' }) {
  const classes = [styles.avatar, styles[size], tone === 'neutral' && styles.neutral, className].filter(Boolean).join(' ')
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <span className={classes} {...a11y}>
      {avatarInitial(name)}
    </span>
  )
}
