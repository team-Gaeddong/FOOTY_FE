import styles from './TeamBalance.module.css'

// 두 팀의 예상 실력 합계와 차이(시안 Lineup). balance는 lineupEdit.js의 teamBalance 결과다.
// 저장하기 전에는 화면의 예상이고, 저장하면 서버가 계산한 값으로 바뀐다.
export function TeamBalance({ teams, balance }) {
  const [first, second] = teams
  return (
    <section className={styles.card} aria-label="팀 균형">
      <div className={styles.numbers}>
        <div className={styles.side}>
          <span className={styles.label}>{first.name} 예상 합계</span>
          <span className={styles.first}>{balance.a}</span>
        </div>
        <div className={styles.diff}>
          <span className={styles.label}>차이</span>
          <span className={styles.diffValue}>{balance.diff}</span>
        </div>
        <div className={`${styles.side} ${styles.sideEnd}`}>
          <span className={styles.label}>{second.name} 예상 합계</span>
          <span className={styles.second}>{balance.b}</span>
        </div>
      </div>
      <div
        className={styles.bar}
        role="img"
        aria-label={`${first.name} ${balance.a}, ${second.name} ${balance.b}`}
      >
        <span className={styles.barFirst} style={{ width: `${balance.aPercent}%` }} />
        <span className={styles.barSecond} />
      </div>
      <p className={styles.note}>
        선발 선수의 실력만 더해요. 후보는 합계에서 빠지고, 저장하면 서버 값으로 바뀌어요.
      </p>
    </section>
  )
}
