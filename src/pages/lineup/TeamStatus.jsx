import { Badge } from '../../components/Badge.jsx'
import { CheckIcon } from '../../components/Icons.jsx'
import styles from './TeamStatus.module.css'

// 팀 탭 맨 위의 상태 줄(시안 Lineup "임시 팀 · 조정 중", DetailLineup "확정된 팀").
// view는 lineupView.js의 teamStatusView 결과이고, children은 오른쪽 버튼 자리(확정된 팀의 경기 종료)다.
export function TeamStatus({ view, children }) {
  return (
    <section className={styles.status} aria-labelledby="team-status-title">
      <div className={styles.text}>
        <div className={styles.head}>
          <Badge tone={view.tone}>
            {view.stage === 'confirmed' && <CheckIcon size={12} />}
            {view.badge}
          </Badge>
          <h2 id="team-status-title" className={styles.title}>
            {view.title}
          </h2>
        </div>
        <p className={styles.description}>{view.description}</p>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </section>
  )
}
