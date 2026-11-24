import styles from './Pitch.module.css'

// 세로로 세운 축구장(68×100 비율, 시안 Tactic). 위가 상대 골문, 아래가 우리 골문이다.
// children은 퍼센트 좌표로 절대 배치한다. ref는 좌표 변환에 쓸 경기장 영역이다.
export function Pitch({ ref, children, label = '경기장' }) {
  return (
    <div ref={ref} className={styles.pitch} role="group" aria-label={label}>
      <div className={styles.lines} aria-hidden="true">
        <span className={styles.outline} />
        <span className={styles.halfway} />
        <span className={styles.circle} />
        <span className={`${styles.box} ${styles.boxTop}`} />
        <span className={`${styles.small} ${styles.smallTop}`} />
        <span className={`${styles.box} ${styles.boxBottom}`} />
        <span className={`${styles.small} ${styles.smallBottom}`} />
      </div>
      {children}
    </div>
  )
}
