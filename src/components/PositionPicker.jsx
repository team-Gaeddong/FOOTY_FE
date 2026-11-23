import { useId } from 'react'
import styles from './PositionPicker.module.css'
import { POSITIONS, togglePosition } from './positions.js'

const DEFAULT_HINT = '누른 순서대로 우선순위가 정해져요. 1~4개'

// 포지션을 우선순위와 함께 고르는 제어형 컴포넌트(BE D-13).
// value는 고른 포지션 배열이고 순서가 곧 우선순위다. 누를 때마다 onChange로 새 배열을 넘긴다.
// 회원 선호 포지션(온보딩), 경기별 선수 포지션, 비회원 선수 등록이 같은 규칙을 쓴다.
// columns: 한 줄에 놓을 타일 수(기본 4, 좁은 카드는 2). showOrder: 아래 "현재 순서" 줄을 보일지(기본 true)
export function PositionPicker({
  value,
  onChange,
  legend = '포지션',
  hint = DEFAULT_HINT,
  columns = 4,
  showOrder = true,
  invalid = false,
  disabled = false,
}) {
  const hintId = useId()

  return (
    <fieldset
      className={styles.picker}
      aria-describedby={hintId}
      data-invalid={invalid}
      disabled={disabled}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={`${styles.positions} ${columns === 2 ? styles.twoColumns : ''}`}>
        {POSITIONS.map(({ value: position, label }) => {
          const rank = value.indexOf(position) + 1
          return (
            <button
              key={position}
              type="button"
              className={styles.position}
              aria-pressed={rank > 0}
              onClick={() => onChange(togglePosition(value, position))}
            >
              {rank > 0 && <span className={styles.rank}>{rank}순위</span>}
              <span className={styles.code}>{position}</span>
              <span className={styles.label}>{label}</span>
            </button>
          )
        })}
      </div>
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
      {showOrder && (
        <div className={styles.order} aria-live="polite">
          <span className={styles.orderLabel}>현재 순서</span>
          {value.length === 0 ? (
            <span className={styles.orderEmpty}>아직 고르지 않았어요</span>
          ) : (
            <span className={styles.chips}>
              {value.map((position, index) => (
                <span key={position} className={index === 0 ? styles.chipFirst : styles.chip}>
                  {position}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </fieldset>
  )
}
