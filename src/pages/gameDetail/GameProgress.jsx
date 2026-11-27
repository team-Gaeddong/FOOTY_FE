import { CheckIcon } from '../../components/Icons.jsx'
import { progressSteps } from './gameDetail.js'
import styles from './GameOverview.module.css'

// 파티장 개요의 진행 단계(선수 모집 → 실력 입력 → 팀 짜기 → 팀 확정 → 경기 종료).
// unrated: 실력을 아직 안 매긴 선수 수(목록을 못 받았으면 null)
export function GameProgress({ game, unrated }) {
  const steps = progressSteps({ status: game.status, playerCount: game.playerCount, unrated })

  return (
    <section className={`${styles.card} ${styles.progressCard}`} aria-labelledby="progress-title">
      <h2 id="progress-title" className={styles.smallTitle}>
        진행 단계
      </h2>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li
            key={step.index}
            className={styles.step}
            data-state={step.state}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className={styles.stepBar} aria-hidden="true" />
            <span className={styles.stepBody}>
              <span className={styles.stepMark} aria-hidden="true">
                {step.state === 'done' ? <CheckIcon size={14} strokeWidth={2.5} /> : step.index}
              </span>
              <span className={styles.stepText}>
                <span className={styles.stepLabel}>
                  {step.label}
                  {step.state === 'done' && <span className={styles.srOnly}> (완료)</span>}
                </span>
                <span className={styles.stepCaption}>{step.caption}</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
