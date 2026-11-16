import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers, updatePlayerPositions } from '../api/games.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { PositionPicker } from '../components/PositionPicker.jsx'
import { POSITION_LABELS, isValidPositions } from '../components/positions.js'
import { applyPositions, countWithoutPositions, samePositions } from './playerPositions.js'
import styles from './PlayerPositionPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 포지션이 있어요. 저장하지 않고 나갈까요?'
const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const INVALID_POSITIONS = '포지션을 1~4개 골라 주세요.'

function parseId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '참가 선수를 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '참가 선수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// lock: 다시 저장해도 안 되는 경우라 편집을 막는다. reload: 목록을 새로 받아야 하는 경우
function saveErrorOf(error) {
  if (!(error instanceof ApiError)) return { message: '저장하지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: NETWORK_ERROR }
  if (error.code === 'GAME_403_1') return { message: '파티장만 포지션을 바꿀 수 있어요.', lock: true }
  if (error.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  if (error.code === 'GAME_409_1') {
    return { message: '모집이 끝난 경기라 포지션을 바꿀 수 없어요.', lock: true }
  }
  if (error.code === 'GAME_404_2') {
    return { message: '참가 선수가 바뀌었어요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error.code === 'MEMBER_400_2' || error.code === 'GLOBAL_400_1') return { message: INVALID_POSITIONS }
  if (error.code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 바꿀 수 있어요.' }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

function positionText(positions) {
  return positions.length > 0
    ? positions.map((position, index) => `${index + 1}순위 ${POSITION_LABELS[position] ?? position}`).join(' · ')
    : '포지션 없음'
}

// 파티장이 참가 선수의 경기별 포지션을 바꾼다(BE D-13). 모집 중인 경기에서만 되고, 선수마다 따로 저장한다.
// 파티장이 아니거나 모집이 끝난 경기면 목록만 보여준다. 최종 권한은 BE 응답(403·409)으로 판단한다.
export function PlayerPositionPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseId(params.gameId)

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, game, players } | { key, error }
  const [editing, setEditing] = useState(null) // { key, id, value }
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null) // { key, savedId } | { key, error }
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const game = current?.game ?? null
  const players = current?.players ?? []
  const draft = editing?.key === requestKey ? editing : null
  const editingPlayer = draft ? players.find((player) => player.id === draft.id) : null
  const currentSave = saveResult?.key === requestKey ? saveResult : null
  const saveError = currentSave?.error ?? null
  const locked = Boolean(saveError?.lock)
  const editable = Boolean(game?.isHost) && game.status === 'RECRUITING' && !locked
  const unsaved = Boolean(editingPlayer) && !samePositions(draft.value, editingPlayer.positions)

  useEffect(() => {
    if (gameId === null) return
    let active = true

    Promise.all([getGame(gameId), listGamePlayers(gameId)])
      .then(([gameData, playerData]) => {
        if (active) setResult({ key: requestKey, game: gameData, players: playerData.players })
      })
      .catch((error) => {
        if (!active) return
        if (error.code === 'MEMBER_404_1') {
          navigate('/login', { replace: true, state: { error: 'member_not_found' } })
          startTransition(() => clearSession())
          return
        }
        setResult({ key: requestKey, error })
      })

    return () => {
      active = false
    }
  }, [gameId, requestKey, navigate, clearSession])

  // 새로고침·탭 닫기 경고. 화면 안 링크는 confirmLeave로 직접 묻는다(SkillLevelPage와 같은 방식).
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

  function startEdit(player) {
    if (saving || (unsaved && !window.confirm(LEAVE_CONFIRM))) return
    setEditing({ key: requestKey, id: player.id, value: player.positions })
    setSaveResult(null)
  }

  function cancelEdit() {
    setEditing(null)
    if (!locked) setSaveResult(null)
  }

  function reload() {
    setEditing(null)
    setSaveResult(null)
    setRetryCount((count) => count + 1)
  }

  async function handleSave(event) {
    event.preventDefault()
    if (pending.current || !editingPlayer || !editable) return
    if (!isValidPositions(draft.value)) {
      setSaveResult({ key: requestKey, error: { message: INVALID_POSITIONS } })
      return
    }
    if (!unsaved) {
      setEditing(null)
      return
    }
    pending.current = true
    setSaving(true)
    setSaveResult(null)
    try {
      await updatePlayerPositions(gameId, draft.id, draft.value)
      setResult({ ...current, players: applyPositions(players, draft.id, draft.value) })
      setEditing(null)
      setSaveResult({ key: requestKey, savedId: draft.id })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const nextError = saveErrorOf(error)
      if (nextError.lock) setEditing(null)
      setSaveResult({ key: requestKey, error: nextError })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  const backLink = gameId === null ? (
    <Link className={styles.backLink} to="/games">← 경기 목록</Link>
  ) : (
    <Link className={styles.backLink} to={`/games/${gameId}`} onClick={confirmLeave}>← 경기 상세</Link>
  )

  if (gameId === null) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>경기 주소가 올바르지 않아요</h1>
          <p className={styles.muted}>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.primaryLink} to="/games">경기 목록 보기</Link>
        </section>
      </PageLayout>
    )
  }

  if (!current) return <LoadingScreen />

  if (current.error) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>포지션 설정</h1>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button variant="secondary" onClick={reload}>다시 불러오기</Button>
        </section>
      </PageLayout>
    )
  }

  const withoutPositions = countWithoutPositions(players)
  const savedPlayer = currentSave?.savedId ? players.find((player) => player.id === currentSave.savedId) : null
  const readOnlyReason = !game.isHost
    ? '포지션은 파티장만 바꿀 수 있어요.'
    : game.status !== 'RECRUITING'
      ? '모집이 끝난 경기라 포지션을 바꿀 수 없어요.'
      : null

  return (
    <PageLayout>
      {backLink}
      <header className={styles.header}>
        <p className={styles.eyebrow}>{game.title}</p>
        <h1>포지션 설정</h1>
        <p>
          {editable
            ? '선수마다 이 경기에서 뛸 포지션을 정해요. 팀을 짤 때 1순위 포지션으로 배정돼요.'
            : '이 경기 참가 선수의 포지션이에요.'}
        </p>
      </header>

      {readOnlyReason && <p className={styles.notice} role="status">{readOnlyReason}</p>}

      {players.length === 0 ? (
        <section className={styles.panel}>
          <h2>아직 참가한 선수가 없어요</h2>
          <p className={styles.muted}>선수가 참가하면 포지션을 볼 수 있어요.</p>
        </section>
      ) : (
        <section className={styles.panel} aria-labelledby="position-list-title">
          <div className={styles.listHeader}>
            <h2 id="position-list-title">참가 선수 {players.length}명</h2>
            {withoutPositions > 0 && (
              <span className={styles.missing} role="status">포지션 없음 {withoutPositions}명</span>
            )}
          </div>

          {/* 편집 폼을 닫는 에러(lock·reload)와 저장 완료는 목록 위에, 폼 안 에러는 폼에 보여준다 */}
          {(saveError?.lock || saveError?.reload) && <ErrorMessage>{saveError.message}</ErrorMessage>}
          {saveError?.reload && <Button variant="secondary" onClick={reload}>목록 다시 불러오기</Button>}
          {savedPlayer && (
            <p className={styles.saved} role="status">{savedPlayer.name} 선수의 포지션을 저장했어요.</p>
          )}

          <ul className={styles.players}>
            {players.map((player) => {
              const isEditing = editingPlayer?.id === player.id
              return (
                <li key={player.id} className={isEditing ? styles.editing : ''}>
                  <div className={styles.row}>
                    <div className={styles.playerInfo}>
                      <span className={styles.playerName}>
                        {player.name}
                        {player.memberId === null && <span className={styles.badge}>비회원</span>}
                        {player.isSubstitute && <span className={styles.badge}>후보</span>}
                      </span>
                      <span className={player.positions.length > 0 ? styles.positions : styles.noPositions}>
                        {positionText(player.positions)}
                      </span>
                    </div>
                    {editable && !isEditing && (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => startEdit(player)}
                        disabled={saving}
                        aria-label={`${player.name} 포지션 바꾸기`}
                      >
                        바꾸기
                      </button>
                    )}
                  </div>

                  {isEditing && editable && (
                    <form className={styles.form} onSubmit={handleSave} noValidate>
                      <PositionPicker
                        legend={`${player.name} 포지션`}
                        value={draft.value}
                        onChange={(next) => {
                          setEditing({ ...draft, value: next })
                          setSaveResult(null)
                        }}
                        invalid={Boolean(saveError) && !isValidPositions(draft.value)}
                        disabled={saving}
                      />
                      {!saveError?.reload && <ErrorMessage>{saveError?.message}</ErrorMessage>}
                      <div className={styles.formActions}>
                        <Button variant="secondary" onClick={cancelEdit} disabled={saving}>취소</Button>
                        <Button type="submit" disabled={saving}>
                          {saving ? '저장하는 중…' : '저장'}
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Link className={styles.secondaryLink} to={`/games/${gameId}`} onClick={confirmLeave}>
        경기 상세로 돌아가기
      </Link>
    </PageLayout>
  )
}
