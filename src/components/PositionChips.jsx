import styles from './PositionChips.module.css'

// 선수의 포지션을 우선순위 순서로 보여 주는 작은 칩. 첫 칩(1순위)만 채워서 구분한다.
export function PositionChips({ positions }) {
  if (!positions?.length) return null
  return (
    <span className={styles.chips}>
      {positions.map((position, index) => (
        <span key={position} className={index === 0 ? styles.first : styles.chip}>
          {position}
        </span>
      ))}
    </span>
  )
}
