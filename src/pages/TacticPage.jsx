import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getLatestLineup } from '../api/lineups.js'
import { getTactic, updateTactic } from '../api/tactics.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { TacticBoard } from '../components/TacticBoard.jsx'
import { DEFAULT_FORMATION, FORMATION_NAMES } from '../components/formations.js'
import {
  changeFormation,
  placementsFromMembers,
  toPlacementRequest,
} from '../components/tacticPlacements.js'
import { checkHost } from './checkHost.js'
import styles from './TacticPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 배치가 있어요. 저장하지 않고 나갈까요?'
const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

function parseId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '전술 배치도를 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error.code === 'LINEUP_404_1') return '이 경기에 없는 팀이에요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '전술 배치도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// lock: 다시 저장해도 안 되는 경우라 편집을 막는다
function saveErrorOf(error) {
  if (!(error instanceof ApiError)) return { message: '저장하지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: NETWORK_ERROR }
  if (error.code === 'GAME_403_1') return { message: '파티장만 전술을 저장할 수 있어요.', lock: true }
  if (error.code === 'LINEUP_409_4') return { message: '확정된 팀이라 전술을 바꿀 수 없어요.', lock: true }
  if (error.code === 'LINEUP_400_1') return { message: '같은 선수가 두 번 배치됐어요. 새로고침한 뒤 다시 배치해 주세요.' }
  if (error.code === 'LINEUP_400_2') return { message: '팀 구성이 바뀌었어요. 새로고침한 뒤 다시 배치해 주세요.' }
  if (error.code === 'GLOBAL_400_1') return { message: '배치 값이 올바르지 않아요. 11명 이하인지 확인해 주세요.' }
  if (error.code === 'GAME_404_1' || error.code === 'LINEUP_404_1') {
    return { message: '경기나 팀이 없어져 저장할 수 없어요.', lock: true }
  }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

function draftFrom(tactic) {
  const formation = tactic.formation ?? DEFAULT_FORMATION
  return { formation, placements: placementsFromMembers(tactic.members, formation) }
}

// 저장할 값이 같은지 비교한다(슬롯 번호는 화면용이라 빼고 본다).
function sameDraft(a, b) {
  return (
    a.formation === b.formation &&
    JSON.stringify(toPlacementRequest(a.placements)) === JSON.stringify(toPlacementRequest(b.placements))
  )
}

// 팀 하나의 포메이션과 선수 배치를 보고 고친다(BE D-23). 저장은 파티장만 된다.
// 파티장이 아니면 처음부터 읽기 전용으로 보여주고, 최종 권한은 BE 응답(403·409)으로 판단한다.
// 팀 짜기 화면에서 들어오면 팀 목록을 이동 state로 받고, 새로고침 등으로 없으면 최근 라인업에서 가져온다(BE D-24).
export function TacticPage() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseId(params.gameId)
  const teamId = parseId(params.teamId)
  const stateTeams = location.state?.gameId === gameId ? location.state.teams : null
  const gameTitle = location.state?.gameId === gameId ? location.state.gameTitle : null
  const knownHostId = location.state?.gameId === gameId ? (location.state.hostId ?? null) : null

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${teamId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const [draft, setDraft] = useState(null) // { key, formation, placements }
  const [saving, setSaving] = useState(false)
  // 팀을 바꾸면(requestKey가 바뀌면) 이전 팀의 저장 결과는 보이지 않도록 key를 붙인다
  const [saveResult, setSaveResult] = useState(null) // { key, saved } | { key, error: { message, lock } }
  const [hostResult, setHostResult] = useState(null) // { key: gameId, isHost: true | false | null }
  const [lineupTeams, setLineupTeams] = useState(null) // { key: gameId, teams }
  const pending = useRef(false)
  const teams = stateTeams ?? (lineupTeams?.key === gameId ? lineupTeams.teams : null)

  const current = result?.key === requestKey ? result : null
  const saved = current?.data ? draftFrom(current.data) : null
  const editing = draft?.key === requestKey ? draft : saved
  const dirty = Boolean(saved && editing && !sameDraft(saved, editing))
  const currentSave = saveResult?.key === requestKey ? saveResult : null
  const saveError = currentSave?.error ?? null
  const isHost = hostResult?.key === gameId ? hostResult.isHost : undefined
  const locked = Boolean(saveError?.lock)
  const readOnly = locked || isHost === false
  const unsaved = dirty && !readOnly

  useEffect(() => {
    if (gameId === null || teamId === null) return
    let active = true

    getTactic(gameId, teamId)
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
  }, [gameId, teamId, requestKey, navigate, clearSession])

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

  // 팀 탭용. LINEUP_404_2(아직 팀을 짜지 않음)를 포함해 실패하면 탭만 숨기고 배치도는 그대로 보여준다.
  useEffect(() => {
    if (gameId === null || stateTeams) return
    let active = true

    getLatestLineup(gameId)
      .then((lineup) => {
        if (!active) return
        const nextTeams = lineup.teams.map(({ teamId: id, name }) => ({ teamId: id, name }))
        setLineupTeams({ key: gameId, teams: nextTeams })
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [gameId, stateTeams])

  // 새로고침·탭 닫기 경고. BrowserRouter는 화면 안 이동을 막는 기능(useBlocker)이 없어
  // 이 화면의 링크는 confirmLeave로 직접 묻고, 브라우저 뒤로 가기는 막지 못한다.
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

  function updateDraft(next) {
    setDraft({ key: requestKey, ...editing, ...next })
    if (!locked) setSaveResult(null)
  }

  async function handleSave() {
    if (pending.current || !editing || readOnly) return
    pending.current = true
    setSaving(true)
    setSaveResult(null)
    try {
      const data = await updateTactic(gameId, teamId, {
        formation: editing.formation,
        placements: toPlacementRequest(editing.placements),
      })
      setResult({ key: requestKey, data })
      setDraft(null)
      setSaveResult({ key: requestKey, saved: true })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const saveError = saveErrorOf(error)
      // 저장할 수 없게 됐으면 저장되지 않은 배치 대신 저장된 배치를 보여준다
      if (saveError.lock) setDraft(null)
      setSaveResult({ key: requestKey, error: saveError })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  const backLink = (
    <Link className={styles.backLink} to="/games" onClick={confirmLeave}>← 경기 목록</Link>
  )

  if (gameId === null || teamId === null) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>주소가 올바르지 않아요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
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
          <h1>전술 배치도</h1>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button variant="secondary" onClick={() => setRetryCount((count) => count + 1)}>
            다시 불러오기
          </Button>
        </section>
      </PageLayout>
    )
  }

  const tactic = current.data
  const formationOptions = FORMATION_NAMES.includes(editing.formation)
    ? FORMATION_NAMES
    : [...FORMATION_NAMES, editing.formation]

  return (
    <PageLayout>
      {backLink}
      <header className={styles.header}>
        <p className={styles.eyebrow}>{gameTitle ?? `경기 #${gameId}`}</p>
        <h1>{tactic.name} 전술 배치도</h1>
      </header>

      {teams?.length > 1 && (
        <nav className={styles.teamTabs} aria-label="팀 선택">
          {teams.map((team) => (
            <Link
              key={team.teamId}
              className={styles.teamTab}
              to={`/games/${gameId}/teams/${team.teamId}/tactic`}
              state={location.state}
              aria-current={team.teamId === teamId ? 'page' : undefined}
              onClick={confirmLeave}
            >
              {team.name}
            </Link>
          ))}
        </nav>
      )}

      {tactic.members.length === 0 ? (
        <section className={styles.panel}>
          <p>이 팀에 배정된 선수가 없어요.</p>
        </section>
      ) : (
        <>
          <fieldset className={styles.formations} disabled={readOnly}>
            <legend>포메이션</legend>
            <div className={styles.formationOptions}>
              {formationOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={styles.formation}
                  aria-pressed={editing.formation === name}
                  onClick={() =>
                    updateDraft({
                      formation: name,
                      placements: changeFormation(editing.placements, name),
                    })
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </fieldset>

          <TacticBoard
            members={tactic.members}
            formation={editing.formation}
            placements={editing.placements}
            onChange={(placements) => updateDraft({ placements })}
            editable={!readOnly}
          />

          {isHost === false && !locked && (
            <p className={styles.readOnly} role="status">
              파티장만 배치를 바꿀 수 있어요. 저장된 배치를 보여드려요.
            </p>
          )}
          <ErrorMessage>{saveError?.message}</ErrorMessage>
          {currentSave?.saved && !dirty && (
            <p className={styles.saved} role="status">저장했어요.</p>
          )}
          {!readOnly && (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => updateDraft(saved)} disabled={!dirty || saving}>
                되돌리기
              </Button>
              <Button onClick={handleSave} disabled={saving || (!dirty && tactic.formation !== null)}>
                {saving ? '저장 중…' : '저장하기'}
              </Button>
            </div>
          )}
          {!readOnly && (
            <p className={styles.note}>자리를 옮겨도 선수의 배정 포지션은 바뀌지 않아요.</p>
          )}
        </>
      )}
    </PageLayout>
  )
}
