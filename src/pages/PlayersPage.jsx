import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers, updatePlayerPositions, updateSkillLevels } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { ArrowLeftIcon, LockIcon, PinIcon } from '../components/Icons.jsx'
import { isValidPositions } from '../components/positions.js'
import { StateCard } from '../components/StateCard.jsx'
import { PlayerRow } from './PlayerRow.jsx'
import { parseGameId, toSummary } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import { applyPositions, samePositions } from './playerPositions.js'
import {
  INVALID_POSITIONS,
  accessMode,
  loadErrorMessage,
  positionSaveError,
  ratedRatio,
  saveButtonLabel,
  skillSaveError,
} from './playersView.js'
import { applySkillLevels, changedSkillLevels, countUnrated, effectiveSkill } from './skillLevels.js'
import styles from './PlayersPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 변경이 있어요. 저장하지 않고 나갈까요?'

// 선수 관리(/games/:gameId/players, 시안 Players). 예전의 "실력 매기기"와 "포지션 설정"을 한 화면으로 합쳤다.
// 실력은 1~10 점수를 바꾼 선수만 한 번에 저장하고(PATCH skill-levels), 포지션은 선수마다 따로 저장한다(PUT positions).
// 파티장이 아니면 막고, 모집이 끝난 경기에서는 실력만 고칠 수 있다. 최종 권한은 BE 응답(403·409)으로 판단한다.
export function PlayersPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseGameId(params.gameId)

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, game, players, memberId } | { key, error }
  const [drafts, setDrafts] = useState(null) // { key, values: { [gamePlayerId]: skillLevel } }
  const [editing, setEditing] = useState(null) // { key, id, value, invalid }
  const [savingScores, setSavingScores] = useState(false)
  const [savingPositions, setSavingPositions] = useState(false)
  const [outcome, setOutcome] = useState(null) // { key, scores?, positions?, error? }
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const game = current?.game ?? null
  const players = current?.players ?? []
  const mode = game ? accessMode(game) : null
  const values = drafts?.key === requestKey ? drafts.values : {}
  const changes = changedSkillLevels(players, values)
  const unrated = countUnrated(players, values)
  const draft = editing?.key === requestKey ? editing : null
  const editingPlayer = draft ? players.find((player) => player.id === draft.id) : null
  const currentOutcome = outcome?.key === requestKey ? outcome : null
  const error = currentOutcome?.error ?? null
  const locked = Boolean(error?.lock && !error.positionsOnly)
  const positionsLocked = Boolean(error?.lock)
  const canEditScores = (mode === 'edit' || mode === 'scores') && !locked
  const canEditPositions = mode === 'edit' && !positionsLocked
  const positionsUnsaved = Boolean(editingPlayer) && !samePositions(draft.value, editingPlayer.positions)
  const unsaved = (changes.length > 0 && !locked) || positionsUnsaved

  useEffect(() => {
    if (gameId === null) return
    let active = true

    Promise.all([getGame(gameId), listGamePlayers(gameId), getMyProfile().catch(() => null)])
      .then(([gameData, playerData, profile]) => {
        if (active) {
          setResult({
            key: requestKey,
            game: gameData,
            players: playerData.players,
            memberId: profile?.memberId ?? null,
          })
        }
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

  function changeSkill(gamePlayerId, skillLevel) {
    if (skillLevel === null || skillLevel === undefined) return
    setDrafts({ key: requestKey, values: { ...values, [gamePlayerId]: skillLevel } })
    if (!locked) setOutcome(null)
  }

  function startEdit(player) {
    if (savingPositions || (positionsUnsaved && !window.confirm(LEAVE_CONFIRM))) return
    setEditing({ key: requestKey, id: player.id, value: player.positions, invalid: false })
    setOutcome(null)
  }

  function cancelEdit() {
    setEditing(null)
    if (!positionsLocked) setOutcome(null)
  }

  function reload() {
    setDrafts(null)
    setEditing(null)
    setOutcome(null)
    setRetryCount((count) => count + 1)
  }

  function handleMemberGone() {
    navigate('/login', { replace: true, state: { error: 'member_not_found' } })
    startTransition(() => clearSession())
  }

  async function handleSaveScores() {
    if (pending.current || changes.length === 0 || locked) return
    pending.current = true
    setSavingScores(true)
    setOutcome(null)
    try {
      await updateSkillLevels(gameId, changes)
      setResult({ ...current, players: applySkillLevels(players, changes) })
      setDrafts(null)
      setOutcome({ key: requestKey, scores: changes.length })
    } catch (saveError) {
      if (saveError.code === 'MEMBER_404_1') return handleMemberGone()
      const next = skillSaveError(saveError)
      if (next.lock) setDrafts(null)
      setOutcome({ key: requestKey, error: next })
    } finally {
      pending.current = false
      setSavingScores(false)
    }
  }

  async function handleSavePositions() {
    if (pending.current || !editingPlayer || !canEditPositions) return
    if (!isValidPositions(draft.value)) {
      setEditing({ ...draft, invalid: true })
      setOutcome({ key: requestKey, error: { message: INVALID_POSITIONS } })
      return
    }
    if (!positionsUnsaved) {
      setEditing(null)
      return
    }
    pending.current = true
    setSavingPositions(true)
    setOutcome(null)
    try {
      await updatePlayerPositions(gameId, draft.id, draft.value)
      setResult({ ...current, players: applyPositions(players, draft.id, draft.value) })
      setEditing(null)
      setOutcome({ key: requestKey, positions: editingPlayer.name })
    } catch (saveError) {
      if (saveError.code === 'MEMBER_404_1') return handleMemberGone()
      const next = positionSaveError(saveError)
      if (next.lock) setEditing(null)
      setOutcome({ key: requestKey, error: next })
    } finally {
      pending.current = false
      setSavingPositions(false)
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
        참가 선수를 불러오는 중…
      </p>
    )
  } else if (current.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={reload}>
          다시 불러오기
        </Button>
      </div>
    )
  } else if (mode === 'forbidden') {
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
        선수의 실력은 파티장만 매기고 볼 수 있어요.
      </StateCard>
    )
  } else {
    const rated = players.length - unrated
    const savedMessage = currentOutcome?.scores
      ? `${currentOutcome.scores}명의 실력 점수를 저장했어요.`
      : currentOutcome?.positions
        ? `${currentOutcome.positions} 선수의 포지션을 저장했어요.`
        : null

    // 저장 줄: 시안은 PC에서 선수 카드 안 오른쪽 아래, 모바일에서 화면 아래 고정이라
    // 같은 내용을 두 곳에 두고 화면 폭으로 하나만 보인다
    const saveBarContent = (
      <>
        <span className={styles.saveCount}>
          {changes.length > 0 ? `바꾼 선수 ${changes.length}명` : '바꾼 선수 없음'}
        </span>
        <Button
          size="lg"
          fit="responsive"
          onClick={handleSaveScores}
          disabled={savingScores || locked || changes.length === 0}
        >
          <span className={styles.labelWide}>{saveButtonLabel({ saving: savingScores, count: changes.length })}</span>
          <span className={styles.labelCompact}>
            {saveButtonLabel({ saving: savingScores, count: changes.length, compact: true })}
          </span>
        </Button>
      </>
    )

    content = (
      <>
        <section className={styles.progress} aria-label="실력 입력 현황">
          <div className={styles.progressMain}>
            <div className={styles.progressHead}>
              <span className={styles.progressLabel}>실력 입력</span>
              <span className={styles.progressCount}>
                {`${rated} / ${players.length}명`}
              </span>
            </div>
            <div className={styles.meter} role="img" aria-label={`${players.length} 중 ${rated}`}>
              <span style={{ width: `${Math.round(ratedRatio(rated, players.length) * 100)}%` }} />
            </div>
          </div>
          <span className={styles.progressNote}>
            <LockIcon size={14} />
            실력은 파티장에게만 보여요
          </span>
        </section>

        {players.length === 0 ? (
          <StateCard icon={<PinIcon size={22} />} title="아직 참가한 선수가 없어요">
            선수가 참가하면 여기서 실력과 포지션을 정할 수 있어요.
          </StateCard>
        ) : (
          <section className={styles.card} aria-labelledby="players-title">
            <div className={styles.cardHeader}>
              <h2 id="players-title" className={styles.cardTitle}>
                참가 선수
              </h2>
              <span className={styles.cardCount}>{`${players.length}명 · 참여 순`}</span>
            </div>
            <ul className={styles.list}>
              {players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isMe={current.memberId !== null && player.memberId === current.memberId}
                  skill={effectiveSkill(player, values)}
                  changed={values[player.id] !== undefined && values[player.id] !== player.skillLevel}
                  scoresDisabled={!canEditScores || savingScores}
                  canEditPositions={canEditPositions}
                  editor={
                    draft?.id === player.id && canEditPositions
                      ? { value: draft.value, invalid: draft.invalid, saving: savingPositions }
                      : null
                  }
                  onSkillChange={(value) => changeSkill(player.id, value)}
                  onEditPositions={() => startEdit(player)}
                  onPositionsChange={(value) => setEditing({ ...draft, value, invalid: false })}
                  onPositionsSave={handleSavePositions}
                  onPositionsCancel={cancelEdit}
                />
              ))}
            </ul>
            <ErrorMessage>{error?.message}</ErrorMessage>
            {error?.reload && (
              <Button variant="secondary" fit="auto" onClick={reload}>
                목록 다시 불러오기
              </Button>
            )}
            {savedMessage && (
              <p className={styles.saved} role="status">
                {savedMessage}
              </p>
            )}
            {mode === 'edit' && unrated === 0 && !unsaved && !locked && players.length > 0 && (
              <Button
                as={Link}
                to={`/games/${gameId}/lineup/edit`}
                state={{ game: toSummary(game) }}
                variant="secondary"
                fit="auto"
                className={styles.nextStep}
              >
                팀 짜기로 가기
              </Button>
            )}
            <div className={`${styles.saveBar} ${styles.saveBarInline}`}>{saveBarContent}</div>
          </section>
        )}

        {players.length > 0 && <div className={`${styles.saveBar} ${styles.saveBarMobile}`}>{saveBarContent}</div>}
      </>
    )
  }

  return (
    <main className={styles.page}>
      {gameId !== null && (
        <Link className={styles.back} to={`/games/${gameId}`} onClick={confirmLeave}>
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
        <h1 className={styles.title}>선수 관리</h1>
        <p className={styles.lead}>
          {mode === 'scores'
            ? '실력은 1~10으로 매길 수 있어요. 모집이 끝난 경기라 포지션은 바꿀 수 없어요.'
            : '실력은 1~10으로 매기고, 포지션은 모집 중일 때만 바꿀 수 있어요.'}
        </p>
      </header>
      {content}
    </main>
  )
}
