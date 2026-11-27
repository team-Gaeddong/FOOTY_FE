import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { getBalanceSummary, getMyBalanceReview } from '../../api/balanceReviews.js'
import { getMyMvpVote } from '../../api/mvpVotes.js'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { ClockIcon, FlagIcon, LockIcon, RepeatIcon, ScaleIcon, TrophyIcon } from '../../components/Icons.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { GameHeader } from '../gameDetail/GameHeader.jsx'
import { squadNoteFromCounts } from '../lineup/lineupView.js'
import {
  afterLoadMessage,
  canViewBalanceResult,
  isAfterOpen,
  mvpBadge,
  reviewBadge,
  reviewProgress,
} from './afterTab.js'
import { canOpenMemberTabs, toSummary } from '../gameDetail/gameDetail.js'
import styles from './GameAfterPage.module.css'

// 한 번 불러온 값 하나의 상태. { status: 'loading' } | { status: 'ok', data } | { status: 'error', error }
const LOADING = { status: 'loading' }

// 경기 후 탭(/games/:gameId/after, 시안 DetailAfter). 종료된 경기의 밸런스 평가·MVP 투표·신고·재경기로 가는 카드를 모은다.
// 카드는 링크만 걸고 평가·투표·신고·재경기 화면은 각각 따로 있다. 내 평가·투표 여부와 작성 현황은 이 화면에서 읽기만 한다.
// 세 가지를 따로 받아서 하나가 실패해도 나머지 카드는 그대로 보이고, 실패하면 그 카드 안에 안내와 다시 시도가 뜬다.
export function GameAfterPage() {
  const { game } = useOutletContext()
  const open = isAfterOpen(game) && canOpenMemberTabs(game)

  let content
  if (!isAfterOpen(game)) {
    content = (
      <StateCard
        icon={<ClockIcon size={22} />}
        title="아직 경기가 끝나지 않았어요"
        actions={
          <Button as={Link} to={`/games/${game.id}`} variant="secondary" fit="auto">
            경기 상세로
          </Button>
        }
      >
        경기가 종료되면 밸런스 평가와 MVP 투표를 할 수 있어요.
      </StateCard>
    )
  } else if (!open) {
    content = (
      <StateCard icon={<LockIcon size={22} />} title="참가자만 볼 수 있어요">
        경기 후 메뉴는 파티장과 이 경기 참가자에게만 열려요.
      </StateCard>
    )
  } else {
    content = <AfterCards game={game} />
  }

  return (
    <>
      <GameHeader game={game} current="after" countNote={squadNoteFromCounts(game.playerCount, game.maxPlayers)} />
      {content}
    </>
  )
}

function useLoaded(load, gameId, retryCount) {
  const [result, setResult] = useState({ key: null, state: LOADING })
  const key = `${gameId}:${retryCount}`

  useEffect(() => {
    let active = true
    load(gameId)
      .then((data) => {
        if (active) setResult({ key, state: { status: 'ok', data } })
      })
      .catch((error) => {
        if (active) setResult({ key, state: { status: 'error', error } })
      })
    return () => {
      active = false
    }
  }, [load, gameId, key])

  return result.key === key ? result.state : LOADING
}

function AfterCards({ game }) {
  const [retryCount, setRetryCount] = useState(0)
  const retry = () => setRetryCount((count) => count + 1)
  const me = useLoaded(getMyBalanceReview, game.id, retryCount)
  const summary = useLoaded(getBalanceSummary, game.id, retryCount)
  const mvp = useLoaded(getMyMvpVote, game.id, retryCount)
  const gameState = { game: toSummary(game) }

  const review = me.status === 'ok' ? me.data : null
  const mvpVote = mvp.status === 'ok' ? mvp.data : null
  const progress = summary.status === 'ok' ? reviewProgress(summary.data) : null
  const resultOpen = summary.status === 'ok' && canViewBalanceResult(summary.data)
  const reviewBadgeValue = reviewBadge(review)
  const mvpBadgeValue = mvpBadge(mvpVote)

  return (
    <div className={styles.grid}>
      <Card
        icon={<ScaleIcon size={20} />}
        title="밸런스 평가"
        badge={reviewBadgeValue}
        description="오늘 팀 밸런스가 어땠는지 1~10점으로 남겨 주세요."
      >
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span className={styles.progressLabel}>작성 현황</span>
            <span className={styles.progressValue}>
              {summary.status === 'loading'
                ? '불러오는 중…'
                : progress
                  ? `${progress.reviewed} / ${progress.required}명`
                  : '-'}
            </span>
          </div>
          {progress && (
            <div
              className={styles.bar}
              role="img"
              aria-label={`${progress.required} 중 ${progress.reviewed}`}
            >
              <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
          )}
        </div>
        {(me.status === 'error' || summary.status === 'error') && (
          <p className={styles.error} role="alert">
            {afterLoadMessage((me.status === 'error' ? me : summary).error)}{' '}
            <button type="button" className={styles.retry} onClick={retry}>
              다시 시도
            </button>
          </p>
        )}
        <div className={styles.actions}>
          {review?.reviewed ? (
            <Button fit="auto" disabled>
              평가 완료
            </Button>
          ) : (
            <Button as={Link} to={`/games/${game.id}/balance-review`} state={gameState} fit="auto">
              평가하기
            </Button>
          )}
          {resultOpen ? (
            <Button as={Link} to={`/games/${game.id}/balance-summary`} state={gameState} variant="secondary" fit="auto">
              결과 보기
            </Button>
          ) : (
            <>
              <Button variant="subtle" fit="auto" disabled>
                결과 보기
              </Button>
              <span className={styles.hint}>전원이 작성하면 결과가 열려요</span>
            </>
          )}
        </div>
      </Card>

      <Card
        icon={<TrophyIcon size={20} />}
        title="MVP 투표"
        badge={mvpBadgeValue}
        description="함께 뛴 선수 한 명에게 투표해요. 본인은 고를 수 없어요."
      >
        {mvp.status === 'error' && (
          <p className={styles.error} role="alert">
            {afterLoadMessage(mvp.error)}{' '}
            <button type="button" className={styles.retry} onClick={retry}>
              다시 시도
            </button>
          </p>
        )}
        <div className={styles.actions}>
          <Button as={Link} to={`/games/${game.id}/mvp-vote`} fit="auto" variant={mvpVote?.voted ? 'secondary' : 'primary'}>
            {mvpVote?.voted ? '집계 보기' : '투표하기'}
          </Button>
          {!mvpVote?.voted && <span className={styles.hint}>투표하면 현재 집계를 볼 수 있어요</span>}
        </div>
      </Card>

      <Card
        icon={<FlagIcon size={20} />}
        title="선수 신고"
        description="욕설, 거친 플레이, 무단 불참이 있었다면 알려 주세요."
      >
        <div className={styles.actions}>
          <Button as={Link} to={`/games/${game.id}/report`} variant="secondary" fit="auto">
            신고하기
          </Button>
        </div>
      </Card>

      {game.isHost && (
        <Card
          icon={<RepeatIcon size={20} />}
          title="재경기"
          badge={{ tone: 'deep', label: '파티장' }}
          description="제목·장소·인원은 그대로 두고 날짜만 새로 정해 다음 경기를 열어요."
        >
          <div className={styles.actions}>
            <Button
              as={Link}
              to={`/games/${game.id}/rematch`}
              state={{ sourceGame: toSummary(game) }}
              variant="secondary"
              fit="auto"
            >
              재경기 만들기
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({ icon, title, badge, description, children }) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{title}</h2>
            {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </div>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
      {children}
    </article>
  )
}
