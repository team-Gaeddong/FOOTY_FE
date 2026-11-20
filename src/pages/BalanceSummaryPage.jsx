import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { getBalanceSummary } from '../api/balanceReviews.js'
import { ApiError } from '../api/client.js'
import { Button } from '../components/Button.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { formatAverage, progressRatio, reasonLabel, reasonRows } from './balanceSummary.js'
import { parseGameId } from './gameDetail.js'
import styles from './BalanceSummaryPage.module.css'

// 다시 불러와도 결과가 같은 거절이라 다시 시도 대신 경기 상세로 안내한다.
const BLOCKED_MESSAGES = {
  BALANCE_403_2: ['결과를 볼 수 없어요', '파티장과 이 경기에 참가한 회원만 밸런스 결과를 볼 수 있어요.'],
  GAME_404_1: ['경기를 찾을 수 없어요', '삭제되었거나 없는 경기예요.'],
  LINEUP_404_2: ['팀 구성이 없는 경기예요', '팀을 짜지 않은 경기라 팀별 결과를 계산할 수 없어요.'],
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '결과를 불러오지 못했어요. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 이용할 수 있어요.'
  return '결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
}

// 밸런스 취합 및 점수 계산(GET /games/{gameId}/balance-reviews/summary, BE D-29)
export function BalanceSummaryPage() {
  const gameId = parseGameId(useParams().gameId)
  const location = useLocation()
  const gameTitle = location.state?.game?.id === gameId ? location.state.game.title : null
  const [retry, setRetry] = useState(0)
  // 다른 경기 결과가 남아 보이지 않게 불러온 gameId를 함께 저장한다.
  const [loaded, setLoaded] = useState(null)
  const data = loaded?.gameId === gameId ? loaded : null

  // 상태는 응답 콜백에서만 바꾼다(react-hooks set-state-in-effect).
  useEffect(() => {
    if (gameId === null) return undefined
    let active = true
    getBalanceSummary(gameId).then(
      (summary) => {
        if (active) setLoaded({ gameId, summary })
      },
      (loadError) => {
        if (active) setLoaded({ gameId, error: loadError })
      },
    )
    return () => {
      active = false
    }
  }, [gameId, retry])

  const backLink = (
    <Link className={styles.backLink} to={gameId === null ? '/games' : `/games/${gameId}`}>
      {gameId === null ? '← 경기 목록' : '← 경기 상세'}
    </Link>
  )

  // 로딩 표시는 effect가 아니라 이벤트에서 초기화한다(react-hooks set-state-in-effect).
  function reload() {
    setLoaded(null)
    setRetry((count) => count + 1)
  }

  if (gameId === null) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.messageCard}>
          <h1>경기 정보를 확인할 수 없어요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.secondaryLink} to="/games">경기 목록으로</Link>
        </section>
      </PageLayout>
    )
  }

  if (!data) {
    return (
      <PageLayout>
        {backLink}
        <section className={`${styles.messageCard} ${styles.centered}`} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>밸런스 결과를 불러오는 중…</p>
        </section>
      </PageLayout>
    )
  }

  if (data.error) {
    const blocked = data.error instanceof ApiError ? BLOCKED_MESSAGES[data.error.code] : null
    return (
      <PageLayout>
        {backLink}
        <section className={styles.messageCard} role="alert">
          <h1>{blocked ? blocked[0] : '결과를 불러오지 못했어요'}</h1>
          <p>{blocked ? blocked[1] : loadErrorMessage(data.error)}</p>
          {blocked ? (
            <Link className={styles.secondaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
          ) : (
            <Button variant="secondary" onClick={reload}>다시 시도</Button>
          )}
        </section>
      </PageLayout>
    )
  }

  const { summary } = data
  return (
    <PageLayout>
      {backLink}
      <header className={styles.header}>
        <p className={styles.eyebrow}>{gameTitle ? `경기 후기 · ${gameTitle}` : `경기 후기 · 경기 #${gameId}`}</p>
        <h1>밸런스 결과</h1>
        <p className={styles.intro}>참가한 회원이 모두 평가하면 전체와 팀별 평균 점수를 보여드려요.</p>
      </header>

      {summary.completed ? (
        <CompletedSummary summary={summary} />
      ) : (
        <PendingSummary summary={summary} onRefresh={reload} />
      )}
    </PageLayout>
  )
}

function Progress({ reviewedCount, requiredCount }) {
  return (
    <div className={styles.progress}>
      <div className={styles.progressLabel}>
        <span>평가 참여</span>
        <strong>
          {reviewedCount}
          <span> / {requiredCount}명</span>
        </strong>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="밸런스 평가 참여"
        aria-valuemin={0}
        aria-valuemax={requiredCount}
        aria-valuenow={Math.min(reviewedCount, requiredCount)}
      >
        <span style={{ width: `${progressRatio(reviewedCount, requiredCount) * 100}%` }} />
      </div>
    </div>
  )
}

function PendingSummary({ summary, onRefresh }) {
  const { reviewedCount, requiredCount } = summary
  return (
    <section className={styles.card} aria-labelledby="pending-title">
      <h2 id="pending-title" className={styles.cardTitle}>
        {requiredCount === 0 ? '평가할 회원이 없어요' : '아직 모두 평가하지 않았어요'}
      </h2>
      <p className={styles.cardText}>
        {requiredCount === 0
          ? '이 경기에는 밸런스를 평가할 회원 참가자가 없어요.'
          : `${requiredCount - Math.min(reviewedCount, requiredCount)}명이 더 평가하면 결과가 계산돼요.`}
      </p>
      {requiredCount > 0 && <Progress reviewedCount={reviewedCount} requiredCount={requiredCount} />}
      <Button variant="secondary" onClick={onRefresh}>새로고침</Button>
    </section>
  )
}

function CompletedSummary({ summary }) {
  return (
    <>
      <section className={styles.card} aria-labelledby="overall-title">
        <h2 id="overall-title" className={styles.cardTitle}>전체 평균</h2>
        <p className={styles.average}>
          <strong>{formatAverage(summary.averageScore)}</strong>
          <span> / 10점</span>
        </p>
        <p className={styles.cardText}>참가 회원 {summary.reviewedCount}명이 평가했어요.</p>
      </section>

      {summary.teams.length === 0 ? (
        <section className={styles.card}>
          <p className={styles.empty}>팀별 결과가 없어요.</p>
        </section>
      ) : (
        <div className={styles.teams}>
          {summary.teams.map((team) => (
            <TeamSummaryCard key={team.teamId} team={team} />
          ))}
        </div>
      )}
    </>
  )
}

function TeamSummaryCard({ team }) {
  const titleId = `team-${team.teamId}-title`
  const rows = reasonRows(team.reasonCounts)
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <div className={styles.teamHeader}>
        <h2 id={titleId} className={styles.cardTitle}>{team.name}</h2>
        <p className={styles.teamAverage}>
          <strong>{formatAverage(team.averageScore)}</strong>
          <span> / 10점</span>
        </p>
      </div>

      {team.reviewCount === 0 ? (
        <p className={styles.empty}>이 팀 선수의 평가가 없어요.</p>
      ) : (
        <>
          <p className={styles.cardText}>{team.reviewCount}명 평가</p>
          <div>
            <h3 className={styles.subTitle}>고른 이유</h3>
            <ul className={styles.reasonList}>
              {rows.map((row) => (
                <li key={row.value} className={row.count === 0 ? styles.reasonZero : ''}>
                  <span className={styles.reasonName}>{row.label}</span>
                  <span className={styles.reasonBar} aria-hidden="true">
                    <span style={{ width: `${progressRatio(row.count, team.reviewCount) * 100}%` }} />
                  </span>
                  <strong className={styles.reasonCount}>{row.count}명</strong>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.subTitle}>의견</h3>
            <ul className={styles.reviewList}>
              {team.reviews.map((review) => (
                <li key={review.writerId} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.nickname}>{review.nickname}</span>
                    <strong className={styles.reviewScore}>{review.score}점</strong>
                  </div>
                  {review.reasons.length > 0 && (
                    <ul className={styles.tags} aria-label="고른 이유">
                      {review.reasons.map((reason) => (
                        <li key={reason}>{reasonLabel(reason)}</li>
                      ))}
                    </ul>
                  )}
                  {review.comment && <p className={styles.comment}>{review.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
