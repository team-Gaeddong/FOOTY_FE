import styles from './LineupPitch.module.css'

// 읽기 전용 배치도(팀 탭의 확정된 팀). 세로로 세운 경기장에 선수를 포지션 글자로 보여 준다.
// markers: [{ id, position, x, y }]이고 x·y는 BE 퍼센트 좌표(0~100, 칩 중심)다.
// 끌어서 놓는 전술 배치도(Pitch)와 달리 줄·크기가 시안 팀 탭(DetailLineup)용이다.
export function LineupPitch({ label, markers }) {
  return (
    <div className={styles.pitch} role="img" aria-label={label}>
      <div className={styles.lines} aria-hidden="true">
        <span className={styles.outline} />
        <span className={styles.halfway} />
        <span className={styles.circle} />
        <span className={`${styles.box} ${styles.boxTop}`} />
        <span className={`${styles.small} ${styles.smallTop}`} />
        <span className={`${styles.box} ${styles.boxBottom}`} />
        <span className={`${styles.small} ${styles.smallBottom}`} />
      </div>
      {markers.map((marker) => (
        <span
          key={marker.id}
          className={styles.marker}
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        >
          {marker.position}
        </span>
      ))}
    </div>
  )
}
