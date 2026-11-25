import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { getBalanceSummary } from '../api/balanceReviews.js'
import { ApiError } from '../api/client.js'
import { Avatar } from '../components/Avatar.jsx'
import { Button } from '../components/Button.jsx'
import { AlertTriangleIcon, ArrowLeftIcon, LockIcon, PinIcon, RepeatIcon, ScaleIcon, UsersIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import {
  REVIEW_PREVIEW_COUNT,
  formatAverage,
  progressRatio,
  rankedReasonRows,
  reasonLabel,
} from './balanceSummary.js'
import { parseGameId, toSummary } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import { useGameInfo } from './useGameInfo.js'
import styles from './BalanceSummaryPage.module.css'

// 다시 불러와도 결과가 같은 거절이라 다시 시도 대신 경기 후 탭으로 안내한다.
const BLOCKED_MESSAGES = {
  BALANCE_403_2: {
    icon: <LockIcon size={22} />,
    title: '결과를 볼 수 없어요',
    text: '파티장과 이 경기에 참가한 회원만 밸런스 결과를 볼 수 있어요.',
  },
  GAME_404_1: {
    icon: <PinIcon size={22} />,
    title: '경기를 찾을 수 없어요',
    text: '삭제됐거나 없는 경기예요.',
  },
  LINEUP_404_2: {
    icon: <UsersIcon size={22} />,
    title: '팀 구성이 없는 경기예요',
    text: '팀을 짜지 않은 경기라 팀별 결과를 계산할 수 없어요.',
  },
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '결과를 불러오지 못했어요. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 이용할 수 있어요.'
  return '결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
}

// 밸런스 취합 및 점수 계산(GET /games/{gameId}/balance-reviews/summary, BE D-29). 시안 BalanceSummary.
export function BalanceSummaryPage() {
  const gameId = parseGameId(useParams().gameId)
  const location = useLocation()
  const game = useGameInfo(gameId, location.state?.game)
  const [retry, setRetry] = useState(0)
  // 다른 경기 결과가 남아 보이지 않게 불러온 gameId를 함께 저장한다.
  const [loaded, setLoaded] = useState(null)
  const data = loaded?.gameId === gameId ? loaded : null
  const backTo = gameId === null ? '/' : `/games/${gameId}/after`

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

  // 로딩 표시는 effect가 아니라 이벤트에서 초기화한다(react-hooks set-state-in-effect).
  function reload() {
    setLoaded(null)
    setRetry((count) => count + 1)
  }

  const completed = data?.summary?.completed === true
  let body
  if (gameId === null) {
    body = (
      <StateCard
        icon={<PinIcon size={22} />}
        title="경기 주소가 올바르지 않아요"
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        경기 목록에서 다시 선택해 주세요.
      </StateCard>
    )
  } else if (!data) {
    body = (
      <p className={styles.message} role="status">
        밸런스 결과를 불러오는 중…
      </p>
    )
  } else if (data.error) {
    const blocked = data.error instanceof ApiError ? BLOCKED_MESSAGES[data.error.code] : null
    body = blocked ? (
      <StateCard
        icon={blocked.icon}
        title={blocked.title}
        actions={
          <Button as={Link} to={backTo} variant="secondary" fit="auto">
            경기 후 탭으로
          </Button>
        }
      >
        {blocked.text}
      </StateCard>
    ) : (
      <StateCard
        role="alert"
        tone="danger"
        icon={<AlertTriangleIcon size={22} />}
        title="결과를 불러오지 못했어요"
        actions={
          <Button variant="secondary" fit="auto" onClick={reload}>
            다시 시도
          </Button>
        }
      >
        {loadErrorMessage(data.error)}
      </StateCard>
    )
  } else if (!completed) {
    body = <PendingSummary summary={data.summary} onRefresh={reload} />
  } else {
    body = <CompletedSummary summary={data.summary} game={game} />
  }

  return (
    <main className={styles.page}>
      {gameId !== null && (
        <Link className={styles.back} to={backTo}>
          <ArrowLeftIcon size={18} />
          {game?.title ?? '경기 후'}
        </Link>
      )}
      <header className={styles.header}>
        {game && (
          <p className={styles.eyebrow}>
            {game.title} · {dateTimeLabel(game.playDate)}
          </p>
        )}
        <h1 className={styles.title}>밸런스 결과</h1>
        <p className={styles.lead}>
          {completed ? '참가자 전원이 평가를 마쳐 결과가 열렸어요.' : '참가자 전원이 평가를 마치면 결과가 열려요.'}
        </p>
      </header>
      {body}
    </main>
  )
}

// 시안 States "아직 집계 전이에요"(completed: false)
function PendingSummary({ summary, onRefresh }) {
  const { reviewedCount, requiredCount } = summary
  if (requiredCount === 0) {
    return (
      <StateCard icon={<UsersIcon size={22} />} title="평가할 회원이 없어요">
        이 경기에는 밸런스를 평가할 회원 참가자가 없어요.
      </StateCard>
    )
  }
  const reviewed = Math.min(reviewedCount, requiredCount)
  return (
    <article className={styles.pending}>
      <span className={styles.pendingIcon} aria-hidden="true">
        <ScaleIcon size={22} />
      </span>
      <div className={styles.pendingText}>
        <h2>아직 집계 전이에요</h2>
        <p>참가자 전원이 평가를 마치면 밸런스 결과가 열려요.</p>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          <span>작성 현황</span>
          <strong>
            {reviewed} / {requiredCount}명
          </strong>
        </div>
        <div
          className={styles.track}
          role="progressbar"
          aria-label="밸런스 평가 작성 현황"
          aria-valuemin={0}
          aria-valuemax={requiredCount}
          aria-valuenow={reviewed}
        >
          <span style={{ width: `${progressRatio(reviewedCount, requiredCount) * 100}%` }} />
        </div>
      </div>
      <Button variant="secondary" fit="auto" className={styles.refresh} onClick={onRefresh}>
        새로고침
      </Button>
    </article>
  )
}

function CompletedSummary({ summary, game }) {
  return (
    <>
      <div className={styles.stats}>
        <StatCard
          label="전체 평균"
          value={summary.averageScore}
          note={`${summary.reviewedCount}명 전원 작성`}
          accent
        />
        {summary.teams.map((team) => (
          <StatCard
            key={team.teamId}
            label={`${team.name} 평균`}
            value={team.averageScore}
            note={`${team.reviewCount}명 작성`}
          />
        ))}
      </div>

      {summary.teams.length === 0 ? (
        <StateCard icon={<UsersIcon size={22} />} title="팀별 결과가 없어요" />
      ) : (
        <div className={styles.teams}>
          {summary.teams.map((team) => (
            <TeamSummaryCard key={team.teamId} team={team} />
          ))}
        </div>
      )}

      {/* 재경기는 원본 경기의 파티장만 만들 수 있어(BE GAME_403_1) 경기 후 탭과 같이 파티장에게만 보인다 */}
      {game?.isHost && game.host && (
        <aside className={styles.next}>
          <div className={styles.nextText}>
            <p className={styles.nextTitle}>다음 경기에 반영해 보세요</p>
            <p>결과가 팀을 자동으로 바꾸지는 않아요. 재경기를 열고 팀 짜기에서 직접 다듬을 때 참고해 주세요.</p>
          </div>
          <Button
            as={Link}
            to={`/games/${game.id}/rematch`}
            state={{ sourceGame: toSummary(game) }}
            variant="secondary"
            fit="auto"
          >
            <RepeatIcon size={18} />
            재경기 만들기
          </Button>
        </aside>
      )}
    </>
  )
}

function StatCard({ label, value, note, accent = false }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>
        <strong className={accent ? styles.accent : ''}>{formatAverage(value)}</strong>
        <span> / 10</span>
      </p>
      <p className={styles.statNote}>{note}</p>
    </div>
  )
}

function TeamSummaryCard({ team }) {
  const [expanded, setExpanded] = useState(false)
  const titleId = `team-${team.teamId}-title`
  const rows = rankedReasonRows(team.reasonCounts)
  const reviews = expanded ? team.reviews : team.reviews.slice(0, REVIEW_PREVIEW_COUNT)

  return (
    <section className={styles.team} aria-labelledby={titleId}>
      <div className={styles.teamHeader}>
        <h2 id={titleId}>{team.name}</h2>
        <span className={styles.teamCount}>{team.reviewCount}명 작성</span>
        <strong className={styles.teamAverage}>{formatAverage(team.averageScore)}</strong>
      </div>

      {team.reviewCount === 0 ? (
        <p className={styles.empty}>이 팀 선수의 평가가 없어요.</p>
      ) : (
        <>
          <div className={styles.block}>
            <h3>이유별 응답 수</h3>
            <ul className={styles.reasons}>
              {rows.map((row) => (
                <li key={row.value} className={row.count === 0 ? styles.zero : ''}>
                  <span className={styles.reasonName}>{row.label}</span>
                  <span className={styles.bar} aria-hidden="true">
                    <span style={{ width: `${row.ratio * 100}%` }} />
                  </span>
                  <span className={styles.reasonCount}>
                    {row.count}
                    <span className={styles.srOnly}>명</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.block}>
            <h3>의견</h3>
            <ul className={styles.reviews}>
              {reviews.map((review) => (
                <li key={review.writerId} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <Avatar name={review.nickname} tone="neutral" />
                    <span className={styles.nickname}>{review.nickname}</span>
                    <span className={styles.reviewScore}>
                      {review.score}
                      <span> / 10</span>
                    </span>
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
            {team.reviews.length > REVIEW_PREVIEW_COUNT && (
              <Button
                variant="secondary"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? '접기' : `${team.reviews.length}명 평가 모두 보기`}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
