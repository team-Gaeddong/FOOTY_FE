import styles from './PlayerChip.module.css'
import { POSITION_LABELS } from './positions.js'

// 전술 배치도의 선수 칩. 이름과 배정 포지션을 보여준다.
// BE에 등번호 필드가 없어 등번호는 표시하지 않는다.
// 나머지 props(onPointerDown, onClick, style 등)는 button에 그대로 넘긴다.
export function PlayerChip({
  player,
  onPitch = false,
  selected = false,
  dragging = false,
  className = '',
  ...props
}) {
  const positionLabel = POSITION_LABELS[player.position] ?? player.position
  return (
    <button
      type="button"
      className={`${styles.chip} ${onPitch ? styles.onPitch : ''} ${className}`}
      data-selected={selected}
      data-dragging={dragging}
      aria-pressed={selected}
      aria-label={`${player.name}, ${positionLabel}${player.isSubstitute ? ', 후보' : ''}`}
      {...props}
    >
      <span className={styles.position} aria-hidden="true">{player.position}</span>
      <span className={styles.name}>{player.name}</span>
      {player.isSubstitute && (
        <span className={styles.substitute} aria-hidden="true">후보</span>
      )}
    </button>
  )
}
