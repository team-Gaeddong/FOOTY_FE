import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client.js'
import { getGame, listGamePlayers, listPlayerRatings, updatePlayerRatings } from '../../api/games.js'
import { useAuth } from '../../auth/useAuth.js'
import { Avatar } from '../../components/Avatar.jsx'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { ArrowLeftIcon, ClockIcon, InfoIcon, LockIcon, MinusIcon, PinIcon, PlusIcon } from '../../components/Icons.jsx'
import { PositionChips } from '../../components/PositionChips.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { parseGameId } from '../gameDetail/gameDetail.js'
import { dateTimeLabel } from '../home/homeCalendar.js'
import {
  RATING_MAX,
  RATING_MIN,
  applyRatings,
  buildRatingRows,
  changedRatings,
  effectiveRating,
  formatRating,
  ratingProgress,
  ratingsLoadMessage,
  ratingsSaveError,
  stepRating,
} from './playerRatings.js'
import styles from './PlayerRatingsPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 평점이 있어요. 저장하지 않고 나갈까요?'

// 선수 평점(/games/:gameId/ratings, 시안 PlayerRatings). 경기가 끝난 뒤 파티장이 선수별 경기 후 평점을
// 1.0~10.0(0.5 단위)으로 주고(PATCH players/ratings), 바꾼 선수만 한 번에 저장한다. 다시 저장하면 덮어쓴다(BE D-41).
// 평점은 파티장에게만 보이고 선수는 프로필에서 평균만 본다. 파티장 본인은 평점 대상이 아니다.
// 파티장이 아니거나 종료 전 경기면 막고, 최종 권한은 BE 응답(403·409)으로 판단한다.
export function PlayerRatingsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseGameId(params.gameId)

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, game, rows } | { key, game, forbidden } | { key, error }
  const [drafts, setDrafts] = useState(null) // { key, values: { [gamePlayerId]: rating } }
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState(null) // { key, saved } | { key, error }
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const game = current?.game ?? null
  const rows = current?.rows ?? []
  const values = drafts?.key === requestKey ? drafts.values : {}
  const changes = changedRatings(rows, values)
  const progress = ratingProgress(rows, values)
  const currentOutcome = outcome?.key === requestKey ? outcome : null
  const error = currentOutcome?.error ?? null
  const locked = Boolean(error?.lock)
  const finished = game?.status === 'FINISHED'
  const unsaved = changes.length > 0 && !locked

  useEffect(() => {
    if (gameId === null) return
    let active = true

    async function load() {
      const gameData = await getGame(gameId)
      // 파티장만 평점 목록을 볼 수 있다. 파티장이 아니면 부르지 않고 화면에서 막는다(BE도 GAME_403_1).
      if (!gameData.isHost) return { game: gameData, forbidden: true }
      const [ratingData, playerData] = await Promise.all([
        listPlayerRatings(gameId),
        listGamePlayers(gameId).then((data) => data.players).catch(() => null),
      ])
      return {
        game: gameData,
        rows: buildRatingRows({ ratings: ratingData.players, players: playerData, hostId: gameData.host.id }),
      }
    }

    load()
      .then((data) => {
        if (active) setResult({ key: requestKey, ...data })
      })
      .catch((loadError) => {
        if (!active) return
        if (loadError.code === 'MEMBER_404_1') {
          navigate('/login', { replace: true, state: { error: 'member_not_found' } })
          startTransition(() => clearSession())
          return
        }
        setResult({ key: requestKey, error: loadError })
      })

    return () => {
      active = false
    }
  }, [gameId, requestKey, navigate, clearSession])

  // 새로고침·탭 닫기 경고. 화면 안 링크는 confirmLeave로 직접 묻는다.
  useEffect(() => {
    if (!unsaved) return
    function handleBeforeUnload(event) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unsaved])

  function confirmLeave(event) {
    if (unsaved && !window.confirm(LEAVE_CONFIRM)) event.preventDefault()
  }

  function changeRating(gamePlayerId, rating) {
    if (rating === null || rating === undefined || locked) return
    setDrafts({ key: requestKey, values: { ...values, [gamePlayerId]: rating } })
    setOutcome(null)
  }

  function reload() {
    setDrafts(null)
    setOutcome(null)
    setRetryCount((count) => count + 1)
  }

  async function handleSave() {
    if (pending.current || changes.length === 0 || locked) return
    pending.current = true
    setSaving(true)
    setOutcome(null)
    try {
      await updatePlayerRatings(gameId, changes)
      setResult({ ...current, rows: applyRatings(rows, changes) })
      setDrafts(null)
      setOutcome({ key: requestKey, saved: changes.length })
    } catch (saveError) {
      if (saveError.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const next = ratingsSaveError(saveError)
      if (next.lock) setDrafts(null)
      setOutcome({ key: requestKey, error: next })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  let content
  if (gameId === null || (current?.error instanceof ApiError && current.error.code === 'GAME_404_1')) {
    content = (
      <StateCard
        icon={<PinIcon size={22} />}
        title={gameId === null ? '경기 주소가 올바르지 않아요' : '경기를 찾을 수 없어요'}
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        {gameId === null ? '경기 목록에서 다시 선택해 주세요.' : '삭제됐거나 없는 경기예요.'}
      </StateCard>
    )
  } else if (!current) {
    content = (
      <p className={styles.message} role="status">
        선수 평점을 불러오는 중…
      </p>
    )
  } else if (current.forbidden || (current.error instanceof ApiError && current.error.code === 'GAME_403_1')) {
    content = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="파티장만 볼 수 있어요"
        actions={
          <Button as={Link} to={`/games/${gameId}`} variant="secondary" fit="auto">
            경기로 돌아가기
          </Button>
        }
      >
        경기별 평점은 파티장만 주고 볼 수 있어요. 받은 평점의 평균은 내 프로필에서 볼 수 있어요.
      </StateCard>
    )
  } else if (current.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{ratingsLoadMessage(current.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={reload}>
          다시 불러오기
        </Button>
      </div>
    )
  } else if (!finished) {
    content = (
      <StateCard
        icon={<ClockIcon size={22} />}
        title="아직 경기가 끝나지 않았어요"
        actions={
          <Button as={Link} to={`/games/${gameId}`} variant="secondary" fit="auto">
            경기 상세로
          </Button>
        }
      >
        경기를 종료한 뒤에 선수 평점을 줄 수 있어요.
      </StateCard>
    )
  } else if (progress.total === 0) {
    content = (
      <StateCard icon={<PinIcon size={22} />} title="평점을 줄 선수가 없어요">
        파티장 말고 이 경기에 참가한 선수가 없어요.
      </StateCard>
    )
  } else {
    const disabled = saving || locked
    const saveButton = (
      <Button size="lg" fit="responsive" onClick={handleSave} disabled={disabled || changes.length === 0}>
        {saving ? '저장하는 중…' : '평점 저장'}
      </Button>
    )

    content = (
      <>
        <section className={styles.progress} aria-label="평점 입력 현황">
          <div className={styles.progressMain}>
            <div className={styles.progressHead}>
              <span className={styles.progressLabel}>평점 입력</span>
              <span className={styles.progressCount}>{`${progress.rated} / ${progress.total}명`}</span>
            </div>
            <div className={styles.meter} role="img" aria-label={`${progress.total} 중 ${progress.rated}`}>
              <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            </div>
          </div>
          <span className={styles.progressNote}>
            <LockIcon size={14} />
            경기별 평점은 파티장에게만 보여요
          </span>
        </section>

        <p className={styles.info}>
          <InfoIcon size={16} />
          <span>선수 본인은 경기별 평점을 볼 수 없고, 받은 평점의 평균만 자기 프로필에서 봐요.</span>
        </p>

        <section className={styles.card} aria-labelledby="ratings-title">
          <div className={styles.cardHeader}>
            <h2 id="ratings-title" className={styles.cardTitle}>
              참가 선수
            </h2>
            <span className={styles.cardCount}>{`${rows.length}명 · 참여 순`}</span>
          </div>
          <ul className={styles.list}>
            {rows.map((row) => (
              <RatingRow
                key={row.id}
                row={row}
                value={effectiveRating(row, values)}
                changed={values[row.id] !== undefined && values[row.id] !== row.rating}
                disabled={disabled}
                onChange={(rating) => changeRating(row.id, rating)}
              />
            ))}
          </ul>
          <ErrorMessage>{error?.message}</ErrorMessage>
          {error?.reload && (
            <Button variant="secondary" fit="auto" onClick={reload}>
              목록 다시 불러오기
            </Button>
          )}
          {currentOutcome?.saved && (
            <p className={styles.saved} role="status">
              {`${currentOutcome.saved}명의 평점을 저장했어요.`}
            </p>
          )}
          <div className={`${styles.saveBar} ${styles.saveBarInline}`}>
            <span className={styles.unit}>1.0~10.0 · 0.5점 단위</span>
            {saveButton}
          </div>
        </section>

        <div className={`${styles.saveBar} ${styles.saveBarMobile}`}>{saveButton}</div>
      </>
    )
  }

  return (
    <main className={styles.page}>
      {gameId !== null && (
        <Link className={styles.back} to={`/games/${gameId}/after`} onClick={confirmLeave}>
          <ArrowLeftIcon size={18} />
          {game?.title ?? '경기 상세'}
        </Link>
      )}
      <header className={styles.header}>
        {game && (
          <p className={styles.eyebrow}>
            {game.title} · {dateTimeLabel(game.playDate)}
          </p>
        )}
        <h1 className={styles.title}>선수 평점</h1>
        <p className={styles.lead}>오늘 경기에서 각 선수가 어땠는지 평점을 매겨 주세요.</p>
      </header>
      {content}
    </main>
  )
}

// 선수 한 줄: 이름·배지·포지션, 오른쪽은 −/+ 평점(파티장 본인은 대상이 아니라는 안내)
function RatingRow({ row, value, changed, disabled, onChange }) {
  const empty = value === null

  return (
    <li className={styles.row} data-changed={changed}>
      <Avatar name={row.name} tone={row.isHost ? 'brand' : 'neutral'} />
      <div className={styles.who}>
        <div className={styles.nameLine}>
          <span className={styles.name}>{row.name}</span>
          {row.isHost && <Badge tone="brand">나</Badge>}
          {row.memberId === null && <Badge tone="gray">비회원</Badge>}
        </div>
        {row.positions.length > 0 && <PositionChips positions={row.positions} />}
      </div>
      {row.ratable ? (
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepButton}
            aria-label={`${row.name} 평점 0.5 낮추기`}
            disabled={disabled || empty || value <= RATING_MIN}
            onClick={() => onChange(stepRating(value, -1))}
          >
            <MinusIcon size={20} />
          </button>
          <span className={empty ? styles.stepValueEmpty : styles.stepValue} aria-live="polite">
            {formatRating(value)}
          </span>
          <button
            type="button"
            className={styles.stepButton}
            aria-label={`${row.name} 평점 0.5 높이기`}
            disabled={disabled || value === RATING_MAX}
            onClick={() => onChange(stepRating(value, 1))}
          >
            <PlusIcon size={20} />
          </button>
        </div>
      ) : (
        <span className={styles.notRatable}>{row.isHost ? '본인은 평점 대상이 아니에요' : '평점 대상이 아니에요'}</span>
      )}
    </li>
  )
}
