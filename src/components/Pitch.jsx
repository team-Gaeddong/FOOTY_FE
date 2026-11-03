import styles from './Pitch.module.css'

// 세로로 세운 축구장(68×105m 비율). 위가 상대 골문, 아래가 우리 골문이다.
// children은 퍼센트 좌표로 절대 배치한다. ref는 좌표 변환에 쓸 경기장 영역이다.
export function Pitch({ ref, children, label = '경기장' }) {
  return (
    <div ref={ref} className={styles.pitch} role="group" aria-label={label}>
      <svg className={styles.lines} viewBox="0 0 68 105" aria-hidden="true">
        <rect x="1" y="1" width="66" height="103" />
        <line x1="1" y1="52.5" x2="67" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <circle className={styles.spot} cx="34" cy="52.5" r="0.5" />
        <rect x="13.84" y="1" width="40.32" height="16.5" />
        <rect x="24.84" y="1" width="18.32" height="5.5" />
        <rect x="13.84" y="87.5" width="40.32" height="16.5" />
        <rect x="24.84" y="98.5" width="18.32" height="5.5" />
        <circle className={styles.spot} cx="34" cy="12" r="0.5" />
        <circle className={styles.spot} cx="34" cy="93" r="0.5" />
      </svg>
      {children}
    </div>
  )
}

