import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { listGamePlayers, updateSkillLevels } from '../api/games.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { POSITION_LABELS } from '../components/positions.js'
import { checkHost } from './checkHost.js'
import {
  SKILL_OPTIONS,
  applySkillLevels,
  changedSkillLevels,
  countUnrated,
  effectiveSkill,
} from './skillLevels.js'
import styles from './SkillLevelPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 실력 점수가 있어요. 저장하지 않고 나갈까요?'
const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

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
  if (error.code === 'GAME_403_1') return { message: '파티장만 실력을 매길 수 있어요.', lock: true }
  if (error.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  if (error.code === 'GAME_404_2') {
    return { message: '참가 선수가 바뀌었어요. 목록을 다시 불러온 뒤 저장해 주세요.', reload: true }
  }
  if (error.code === 'GAME_400_1' || error.code === 'GLOBAL_400_1') {
    return { message: '실력 점수가 올바르지 않아요. 1~10 중에서 골라 주세요.' }
  }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

// 파티장이 참가 선수에게 실력 점수(1~10)를 매긴다(BE #19). 팀 짜기는 모든 선수의 점수가 있어야 된다.
// 실력은 파티장에게만 보이므로(BE D-20) 파티장이 아니면 편집 화면을 보여주지 않는다.
// 파티장인지 확인하지 못하면 편집은 열어 두고 BE 응답(403)으로 판단한다.
export function SkillLevelPage() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseId(params.gameId)
  const game = location.state?.game?.id === gameId ? location.state.game : null
  const knownHostId = game?.hostId ?? null

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const [drafts, setDrafts] = useState(null) // { key, values: { [gamePlayerId]: skillLevel } }
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null) // { key, savedCount } | { key, error }
  const [hostResult, setHostResult] = useState(null) // { key: gameId, isHost: true | false | null }
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const players = current?.data?.players ?? []
  const values = drafts?.key === requestKey ? drafts.values : {}
  const changes = changedSkillLevels(players, values)
  const unrated = countUnrated(players, values)
  const currentSave = saveResult?.key === requestKey ? saveResult : null
  const saveError = currentSave?.error ?? null
  const isHost = hostResult?.key === gameId ? hostResult.isHost : undefined
  const locked = Boolean(saveError?.lock)
  const unsaved = changes.length > 0 && !locked

  useEffect(() => {
    if (gameId === null) return
    let active = true

    listGamePlayers(gameId)
      .then((data) => {
        if (active) setResult({ key: requestKey, data })
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

  useEffect(() => {
    if (gameId === null) return
    let active = true

    checkHost(gameId, knownHostId)
      .then((value) => {
        if (active) setHostResult({ key: gameId, isHost: value })
      })
      .catch(() => {
        if (active) setHostResult({ key: gameId, isHost: null })
      })

    return () => {
      active = false
    }
  }, [gameId, knownHostId])

  // 새로고침·탭 닫기 경고. 화면 안 링크는 confirmLeave로 직접 묻는다(TacticPage와 같은 방식).
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
    setDrafts({ key: requestKey, values: { ...values, [gamePlayerId]: skillLevel } })
    if (!locked) setSaveResult(null)
  }

  function reload() {
    setDrafts(null)
    setSaveResult(null)
    setRetryCount((count) => count + 1)
  }

  async function handleSave() {
    if (pending.current || changes.length === 0 || locked) return
    pending.current = true
    setSaving(true)
    setSaveResult(null)
    try {
      await updateSkillLevels(gameId, changes)
      setResult({ key: requestKey, data: { ...current.data, players: applySkillLevels(players, changes) } })
      setDrafts(null)
      setSaveResult({ key: requestKey, savedCount: changes.length })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const nextError = saveErrorOf(error)
      if (nextError.lock) setDrafts(null)
      setSaveResult({ key: requestKey, error: nextError })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  const backLink = (
    <Link className={styles.backLink} to="/games" onClick={confirmLeave}>← 경기 목록</Link>
  )
  const title = game?.title ?? `경기 #${gameId}`

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

  if (!current || isHost === undefined) return <LoadingScreen />

  if (current.error) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>선수 실력 매기기</h1>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button variant="secondary" onClick={reload}>다시 불러오기</Button>
        </section>
      </PageLayout>
    )
  }

  if (isHost === false) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>선수 실력 매기기</h1>
          <p className={styles.muted}>실력 점수는 파티장만 매기고 볼 수 있어요.</p>
          <Link className={styles.primaryLink} to="/games">경기 목록 보기</Link>
        </section>
      </PageLayout>
    )
  }

  // 팀 짜기는 모집 중인 경기에서만 할 수 있다. 경기 정보를 모르면 링크를 보여주고 BE 응답에 맡긴다.
  const canMatch =
    unrated === 0 && !unsaved && !locked && players.length > 0 && (!game || game.status === 'RECRUITING')

  return (
    <PageLayout>
      {backLink}
      <header className={styles.header}>
        <p className={styles.eyebrow}>{title}</p>
        <h1>선수 실력 매기기</h1>
        <p>1점부터 10점까지 매겨요. 팀 짜기는 모든 선수의 점수가 있어야 할 수 있어요.</p>
      </header>

      {players.length === 0 ? (
        <section className={styles.panel}>
          <h2>아직 참가한 선수가 없어요</h2>
          <p className={styles.muted}>선수가 참가하면 실력 점수를 매길 수 있어요.</p>
        </section>
      ) : (
        <section className={styles.panel} aria-labelledby="skill-list-title">
          <div className={styles.listHeader}>
            <h2 id="skill-list-title">참가 선수 {players.length}명</h2>
            <span className={unrated > 0 ? styles.unrated : styles.allRated} role="status">
              {unrated > 0 ? `미입력 ${unrated}명` : '모두 입력'}
            </span>
          </div>
          <ul className={styles.players}>
            {players.map((player) => {
              const skill = effectiveSkill(player, values)
              const changed = values[player.id] !== undefined && values[player.id] !== player.skillLevel
              const selectId = `skill-${player.id}`
              return (
                <li key={player.id} className={changed ? styles.changed : ''}>
                  <label className={styles.playerInfo} htmlFor={selectId}>
                    <span className={styles.playerName}>
                      {player.name}
                      {player.memberId === null && <span className={styles.guestBadge}>비회원</span>}
                    </span>
                    <span className={styles.positions}>
                      {player.positions.length > 0
                        ? player.positions.map((position) => POSITION_LABELS[position] ?? position).join(' · ')
                        : '희망 포지션 없음'}
                    </span>
                  </label>
                  <select
                    id={selectId}
                    className={`${styles.select} ${skill === null ? styles.selectEmpty : ''}`}
                    value={skill ?? ''}
                    onChange={(event) => changeSkill(player.id, Number(event.target.value))}
                    disabled={locked || saving}
                  >
                    {skill === null && <option value="" disabled>점수</option>}
                    {SKILL_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}점</option>
                    ))}
                  </select>
                </li>
              )
            })}
          </ul>

          <ErrorMessage>{saveError?.message}</ErrorMessage>
          {saveError?.reload && (
            <Button variant="secondary" onClick={reload}>목록 다시 불러오기</Button>
          )}
          {currentSave?.savedCount && !unsaved && (
            <p className={styles.saved} role="status">{currentSave.savedCount}명의 실력 점수를 저장했어요.</p>
          )}
          <Button onClick={handleSave} disabled={saving || locked || changes.length === 0}>
            {saving ? '저장하는 중…' : changes.length > 0 ? `${changes.length}명 저장` : '저장'}
          </Button>
        </section>
      )}

      {canMatch && (
        <Link className={styles.primaryLink} to={`/games/${gameId}/lineup`} state={game ? { game } : undefined}>
          팀 짜기로 가기 →
        </Link>
      )}
    </PageLayout>
  )
}
