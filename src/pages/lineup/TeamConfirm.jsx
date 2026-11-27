import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { CheckIcon } from '../../components/Icons.jsx'
import styles from './TeamConfirm.module.css'

// 확정하면 생기는 일(시안 Lineup). 확정 취소는 BE D-40(PATCH .../lineups/confirm/cancel)이다.
const RESULTS = [
  '더 참가할 수 없어요 (모집 마감).',
  '팀과 전술을 수정할 수 없어요.',
  '경기를 종료하기 전까지는 확정을 취소할 수 있어요.',
]

// 임시 팀을 확정하는 카드(파티장). 저장하지 않은 변경이 있으면 확정을 막는다.
export function TeamConfirm({ unsaved, confirming, disabled, error, onConfirm }) {
  return (
    <section className={styles.card} aria-labelledby="team-confirm-title">
      <div className={styles.row}>
        <div className={styles.text}>
          <h2 id="team-confirm-title" className={styles.title}>
            이 팀으로 확정할까요?
          </h2>
          <ul className={styles.results}>
            {RESULTS.map((text) => (
              <li key={text}>
                <CheckIcon size={16} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <ErrorMessage>{error}</ErrorMessage>
        </div>
        <div className={styles.action}>
          <Button size="lg" onClick={onConfirm} disabled={disabled || confirming || unsaved}>
            {confirming ? '확정하는 중…' : '이 팀으로 확정'}
          </Button>
          {unsaved && (
            <p className={styles.hint} role="status">
              저장하지 않은 변경은 먼저 저장해 주세요.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
