import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { deleteGame, getGame, joinGame, listGamePlayers } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { PositionPicker } from '../components/PositionPicker.jsx'
import { isValidPositions } from '../components/positions.js'
import {
  canDeleteGame,
  countUnratedPlayers,
  deleteErrorMessage,
  fillRatio,
  formatCreatedDate,
  formatPlayDate,
  parseGameId,
  playerBadges,
  positionsText,
} from './gameDetail.js'
import styles from './GameDetailPage.module.css'

const STATUS_LABELS = {
  RECRUITING: '모집 중',
  CONFIRMED: '팀 확정',
  FINISHED: '경기 종료',
}

// 다른 화면이 넘겨준 완료 안내(location.state.notice)
const NOTICE_MESSAGES = {
  'balance-reviewed': '밸런스 평가를 제출했어요.',
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '경기를 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 경기를 볼 수 있어요.'
  return '경기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function joinErrorMessage(error) {
  if (!(error instanceof ApiError)) return '참가하지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'MEMBER_400_2' || error.code === 'GLOBAL_400_1') return '포지션을 1~4개 골라 주세요.'
  if (error.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제된 경기일 수 있어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 참가할 수 있어요.'
  return '참가하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 실력 매기기·팀 짜기·재경기 화면이 경기 목록에서 받는 state와 같은 모양(GameSummaryResponse)
function toSummary(game) {
  return {
    id: game.id,
    title: game.title,
    playDate: game.playDate,
    location: game.location,
    maxPlayers: game.maxPlayers,
    teamCount: game.teamCount,
    status: game.status,
    hostId: game.host.id,
  }
}

// 경기 상세 조회(GET /games/{gameId}, BE D-25). Figma `경기_상세_조회` 시안의 PC 레이아웃을 따른다.
export function GameDetailPage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const noticeMessage = NOTICE_MESSAGES[location.state?.notice]
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${gameId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (gameId === null) return
    let active = true
    getGame(gameId)
      .then((game) => {
        if (active) setResult({ key: requestKey, game })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, requestKey])

  const notFound =
    gameId === null ||
    (currentResult?.error instanceof ApiError && currentResult.error.code === 'GAME_404_1')

  let content
  if (notFound) {
    content = <NotFound />
  } else if (!currentResult) {
    content = (
      <div className={styles.messageCard} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <p>경기를 불러오는 중…</p>
      </div>
    )
  } else if (currentResult.error) {
    content = (
      <section className={styles.messageCard}>
        <p className={styles.errorText} role="alert">
          {loadErrorMessage(currentResult.error)}
        </p>
        <button
          type="button"
          className={styles.tertiaryButton}
          onClick={() => setRetryCount((count) => count + 1)}
        >
          다시 시도
        </button>
      </section>
    )
  } else {
    content = (
      <GameDetail
        game={currentResult.game}
        onUpdated={(game) => setResult({ key: requestKey, game })}
      />
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav>
          <Link className={styles.backLink} to="/games">
            <span aria-hidden="true">←</span> 경기 목록
          </Link>
        </nav>
        {noticeMessage && currentResult?.game && (
          <p className={styles.notice} role="status">
            {noticeMessage}
          </p>
        )}
        {content}
      </div>
    </main>
  )
}

function NotFound() {
  return (
    <section className={styles.messageCard}>
      <h1 className={styles.messageTitle}>경기를 찾을 수 없어요</h1>
      <p className={styles.messageText}>삭제되었거나 없는 경기예요.</p>
      <Link className={styles.tertiaryButton} to="/games">
        경기 목록으로
      </Link>
    </section>
  )
}

function GameDetail({ game, onUpdated }) {
  const playDate = formatPlayDate(game.playDate)
  const ratio = fillRatio(game.playerCount, game.maxPlayers)

  return (
    <>
      <section className={styles.hero} aria-labelledby="game-title">
        <div className={styles.heroMain}>
          <div className={styles.badges}>
            <span
              className={`${styles.badge} ${game.status === 'RECRUITING' ? styles.badgeActive : ''}`}
            >
              {STATUS_LABELS[game.status] ?? game.status}
            </span>
            {game.isHost ? (
              <span className={styles.badge}>내가 만든 경기</span>
            ) : game.isJoined ? (
              <span className={styles.badge}>참가 중</span>
            ) : null}
          </div>
          <h1 id="game-title" className={styles.title}>
            {game.title}
          </h1>
          <p className={styles.meta}>
            <span>{playDate}</span>
            <span className={styles.metaDot} aria-hidden="true">·</span>
            <span>{game.location}</span>
          </p>
        </div>

        <div className={styles.count}>
          <p className={styles.countLabel}>참가 인원</p>
          <p className={styles.countValue}>
            <strong>{game.playerCount}</strong> / {game.maxPlayers}명
          </p>
          <div
            className={styles.meter}
            role="meter"
            aria-label="참가 인원"
            aria-valuemin={0}
            aria-valuemax={game.maxPlayers}
            aria-valuenow={Math.min(game.playerCount, game.maxPlayers)}
            aria-valuetext={`${game.maxPlayers}명 중 ${game.playerCount}명`}
          >
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className={styles.countNote}>후보 선수 포함</p>
        </div>
      </section>

      <div className={styles.columns}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="game-info">
            <h2 id="game-info" className={styles.cardTitle}>
              경기 정보
            </h2>
            <dl className={styles.infoGrid}>
              <InfoItem label="일시" value={playDate} />
              <InfoItem label="장소" value={game.location} />
              <InfoItem label="파티장" value={game.host.nickname} />
              <InfoItem label="정원" value={`${game.maxPlayers}명`} />
              <InfoItem label="팀 수" value={`${game.teamCount}팀`} />
              <InfoItem label="만든 날짜" value={formatCreatedDate(game.createdAt)} />
            </dl>
          </section>
          <PlayersCard game={game} />
        </div>

        {game.isHost ? (
          <HostCard game={game} />
        ) : game.isJoined ? (
          <section className={styles.card} aria-labelledby="side-title">
            <h2 id="side-title" className={styles.cardTitle}>
              참가 완료
            </h2>
            {game.status === 'FINISHED' ? (
              <>
                <p className={styles.cardText}>경기가 끝났어요. 팀 밸런스는 어땠나요?</p>
                <BalanceReviewLink game={game} />
              </>
            ) : (
              <>
                <p className={styles.cardText}>이 경기에 참가했어요.</p>
                <button type="button" className={styles.primaryButton} disabled>
                  참가 완료
                </button>
              </>
            )}
            <Link className={styles.tertiaryButton} to={`/games/${game.id}/notices`} state={{ gameTitle: game.title }}>
              공지 확인
            </Link>
            {game.status === 'FINISHED' && <MvpVoteLink game={game} />}
          </section>
        ) : game.status === 'RECRUITING' ? (
          <JoinCard gameId={game.id} onUpdated={onUpdated} />
        ) : (
          <section className={styles.card} aria-labelledby="side-title">
            <h2 id="side-title" className={styles.cardTitle}>
              참가 신청
            </h2>
            <p className={styles.cardText}>모집이 끝난 경기라 참가할 수 없어요.</p>
            <button type="button" className={styles.primaryButton} disabled>
              모집 마감
            </button>
          </section>
        )}
      </div>
    </>
  )
}

function playersErrorMessage(error) {
  if (!(error instanceof ApiError)) return '참가 선수를 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  return '참가 선수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 참가 선수 목록(GET /games/{gameId}/players, BE D-20). 로그인한 회원 누구나 보고, 실력은 파티장에게만 내려온다.
// 참가하면 playerCount가 바뀌므로 그 값을 요청 키에 넣어 목록을 다시 받는다.
function PlayersCard({ game }) {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, players } | { key, error }
  const requestKey = `${game.id}:${game.playerCount}:${retryCount}`
  const current = result?.key === requestKey ? result : null
  const players = current?.players ?? []
  const unrated = game.isHost ? countUnratedPlayers(players) : 0

  useEffect(() => {
    let active = true
    listGamePlayers(game.id)
      .then((data) => {
        if (active) setResult({ key: requestKey, players: data.players })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [game.id, requestKey])

  return (
    <section className={styles.card} aria-labelledby="players-title" aria-busy={!current}>
      <div className={styles.cardHeader}>
        <h2 id="players-title" className={styles.cardTitle}>
          참가 선수{current?.players && <span className={styles.playerCount}> {players.length}명</span>}
        </h2>
        {game.isHost && current?.players && players.length > 0 && (
          <span className={unrated > 0 ? styles.unratedBadge : styles.ratedBadge}>
            {unrated > 0 ? `실력 미입력 ${unrated}명` : '실력 모두 입력'}
          </span>
        )}
      </div>

      {!current ? (
        <p className={styles.listStatus} role="status">
          참가 선수를 불러오는 중…
        </p>
      ) : current.error ? (
        <div className={styles.listStatus}>
          <p className={styles.errorText} role="alert">
            {playersErrorMessage(current.error)}
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setRetryCount((count) => count + 1)}
          >
            다시 시도
          </button>
        </div>
      ) : players.length === 0 ? (
        <p className={styles.listStatus}>아직 참가한 선수가 없어요.</p>
      ) : (
        <ul className={styles.players}>
          {players.map((player) => (
            <li key={player.id} className={styles.player}>
              <span className={styles.avatar} aria-hidden="true">
                {Array.from(player.name)[0]}
              </span>
              <div className={styles.playerInfo}>
                <p className={styles.playerName}>
                  <span>{player.name}</span>
                  {playerBadges(player, game.host.id).map((badge) => (
                    <span
                      key={badge}
                      className={badge === '파티장' ? styles.hostBadge : styles.playerBadge}
                    >
                      {badge}
                    </span>
                  ))}
                </p>
                <p className={styles.playerPositions}>{positionsText(player.positions)}</p>
              </div>
              {game.isHost &&
                (player.skillLevel === null ? (
                  <span className={styles.unratedBadge}>미입력</span>
                ) : (
                  <span className={styles.skill}>
                    <span className={styles.skillLabel}>실력</span> {player.skillLevel}
                  </span>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className={styles.infoItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

// 노출만 조절한다. 권한은 각 화면에서 BE 응답(GAME_403_1)으로 판단한다.
function HostCard({ game }) {
  const state = { game: toSummary(game) }

  return (
    <section className={styles.card} aria-labelledby="side-title">
      <h2 id="side-title" className={styles.cardTitle}>
        파티장 메뉴
      </h2>
      <Link className={styles.tertiaryButton} to={`/games/${game.id}/notices`} state={{ gameTitle: game.title }}>
        공지 확인
      </Link>
      {game.status === 'RECRUITING' ? (
        <>
          <p className={styles.cardText}>선수 실력을 매긴 뒤 팀을 나눌 수 있어요.</p>
          <div className={styles.actions}>
            <Link className={styles.tertiaryButton} to={`/games/${game.id}/notices/new`} state={state}>
              공지 작성
            </Link>
            <Link className={styles.primaryButton} to={`/games/${game.id}/lineup`} state={state}>
              팀 짜기
            </Link>
            <Link className={styles.tertiaryButton} to={`/games/${game.id}/skill-levels`} state={state}>
              선수 실력 매기기
            </Link>
            <Link className={styles.tertiaryButton} to={`/games/${game.id}/positions`}>
              포지션 설정
            </Link>
          </div>
        </>
      ) : game.status === 'FINISHED' ? (
        <>
          <p className={styles.cardText}>같은 조건으로 다음 경기를 만들 수 있어요.</p>
          <div className={styles.actions}>
            <Link className={styles.tertiaryButton} to={`/games/${game.id}/notices/new`} state={state}>
              공지 작성
            </Link>
            <MvpVoteLink game={game} />
            <BalanceReviewLink game={game} />
            <Link
              className={styles.tertiaryButton}
              to={`/games/${game.id}/rematch`}
              state={{ sourceGame: toSummary(game) }}
            >
              이 경기로 재경기 만들기
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className={styles.cardText}>팀이 확정된 경기예요.</p>
          <Link className={styles.tertiaryButton} to={`/games/${game.id}/notices/new`} state={state}>
            공지 작성
          </Link>
        </>
      )}
      {canDeleteGame(game) && <DeleteGameSection gameId={game.id} />}
    </section>
  )
}

// 경기 삭제(DELETE /games/{gameId}, BE D-33). 되돌릴 수 없으므로 한 번 더 확인받는다.
function DeleteGameSection({ gameId }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      await deleteGame(gameId)
      navigate('/games', { replace: true, state: { notice: 'game-deleted' } })
    } catch (deleteError) {
      setError(deleteErrorMessage(deleteError))
      setDeleting(false)
    }
  }

  if (!confirming) {
    return (
      <div className={styles.dangerZone}>
        <button type="button" className={styles.dangerTextButton} onClick={() => setConfirming(true)}>
          경기 삭제
        </button>
      </div>
    )
  }

  return (
    <div className={styles.dangerZone} role="group" aria-labelledby="delete-title">
      <p id="delete-title" className={styles.dangerTitle}>
        이 경기를 삭제할까요?
      </p>
      <p className={styles.dangerText}>삭제하면 참가 선수와 공지를 포함해 경기를 볼 수 없고, 되돌릴 수 없어요.</p>
      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dangerActions}>
        <button
          type="button"
          className={styles.tertiaryButton}
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          disabled={deleting}
        >
          취소
        </button>
        <button type="button" className={styles.dangerButton} onClick={handleDelete} disabled={deleting}>
          {deleting ? '삭제하는 중…' : '삭제'}
        </button>
      </div>
    </div>
  )
}

// 작성 여부를 미리 알 수 없어 이미 평가했으면 작성 화면에서 BALANCE_409_2로 안내한다.
function BalanceReviewLink({ game }) {
  return (
    <Link
      className={styles.primaryButton}
      to={`/games/${game.id}/balance-review`}
      state={{ game: toSummary(game) }}
    >
      밸런스 평가하기
    </Link>
  )
}

function MvpVoteLink({ game }) {
  return (
    <Link className={styles.tertiaryButton} to={`/games/${game.id}/mvp-vote`}>
      오늘의 MVP 투표
    </Link>
  )
}

function JoinCard({ gameId, onUpdated }) {
  const navigate = useNavigate()
  // null이면 아직 고르지 않은 상태라 선호 포지션을 보여준다.
  const [picked, setPicked] = useState(null)
  const [preferred, setPreferred] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const positions = picked ?? preferred

  // 선호 포지션으로 미리 채운다. 못 불러와도 직접 고르면 되므로 에러는 보여주지 않는다.
  useEffect(() => {
    let active = true
    getMyProfile()
      .then((profile) => {
        if (active) setPreferred(profile.positions.map(({ position }) => position))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!isValidPositions(positions)) {
      setError('포지션을 1~4개 골라 주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await joinGame(gameId, positions)
    } catch (joinError) {
      if (joinError instanceof ApiError && joinError.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        return
      }
      // 이미 참가했거나(GAME_409_3) 모집이 끝났으면(GAME_409_1) 최신 상태를 다시 받아 화면을 맞춘다.
      const stale = joinError instanceof ApiError &&
        (joinError.code === 'GAME_409_3' || joinError.code === 'GAME_409_1')
      if (!stale) {
        setError(joinErrorMessage(joinError))
        setSubmitting(false)
        return
      }
    }
    try {
      onUpdated(await getGame(gameId))
    } catch {
      setError('참가 결과를 확인하지 못했어요. 새로고침해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.card} aria-labelledby="side-title" onSubmit={handleSubmit} noValidate>
      <h2 id="side-title" className={styles.cardTitle}>
        참가 신청
      </h2>
      <p className={styles.cardText}>참가하면 파티장이 팀을 나눌 때 함께 배정돼요.</p>
      <PositionPicker
        legend="내 포지션"
        value={positions}
        onChange={(next) => {
          setPicked(next)
          setError(null)
        }}
        invalid={error !== null && !isValidPositions(positions)}
        disabled={submitting}
      />
      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.primaryButton} disabled={submitting}>
        {submitting ? '참가하는 중…' : '참가하기'}
      </button>
    </form>
  )
}
