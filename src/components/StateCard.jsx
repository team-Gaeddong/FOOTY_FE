import styles from './StateCard.module.css'

// 서버 응답에 따라 본문 자리에 들어가는 안내 카드(시안 States): 빈 화면·잠금·오류 상태.
// tone: 'danger'(빨강 쌍 아이콘) | 'neutral'(회색 아이콘)
// icon: 아이콘 요소, children: 설명, actions: 버튼 줄
// compact: 다른 카드 안에 끼울 때(최소 높이 없음)
export function StateCard({
  tone = 'neutral',
  icon,
  title,
  children,
  actions,
  compact = false,
  className = '',
  ...props
}) {
  const classes = [styles.card, styles[tone], compact && styles.compact, className]
  return (
    <article className={classes.filter(Boolean).join(' ')} {...props}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        {children && <p className={styles.description}>{children}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  )
}
