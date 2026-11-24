import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { getGame } from '../api/games.js'
import { getLatestLineup } from '../api/lineups.js'
import { getTactic, updateTactic } from '../api/tactics.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { ArrowLeftIcon, DownloadIcon, PinIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { TacticBoard } from '../components/TacticBoard.jsx'
import { DEFAULT_FORMATION, FORMATION_NAMES } from '../components/formations.js'
import {
  downloadBlob,
  renderTacticImage,
  tacticImageFileName,
  tacticImageLayout,
} from '../components/tacticImage.js'
import {
  changeFormation,
  placementsFromMembers,
  toPlacementRequest,
} from '../components/tacticPlacements.js'
import { parseGameId } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import { imageErrorMessage, loadErrorMessage, saveErrorOf } from './tacticMessages.js'
import styles from './TacticPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 배치가 있어요. 저장하지 않고 나갈까요?'

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

// 팀 하나의 포메이션과 선수 배치를 보고 고친다(BE D-23, 시안 Tactic). 저장은 파티장만 된다.
// 파티장이 아니면 처음부터 읽기 전용으로 보여주고, 최종 권한은 BE 응답(403·409)으로 판단한다.
// 팀 짜기 화면에서 들어오면 팀 목록을 이동 state로 받고, 새로고침 등으로 없으면 최근 라인업에서 가져온다(BE D-24).
export function TacticPage() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseGameId(params.gameId)
  const teamId = parseGameId(params.teamId)
  const stateTeams = location.state?.gameId === gameId ? location.state.teams : null
  const stateTitle = location.state?.gameId === gameId ? location.state.gameTitle : null

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${teamId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const [draft, setDraft] = useState(null) // { key, formation, placements }
  const [saving, setSaving] = useState(false)
  // 팀을 바꾸면(requestKey가 바뀌면) 이전 팀의 저장 결과는 보이지 않도록 key를 붙인다
  const [saveResult, setSaveResult] = useState(null) // { key, saved } | { key, error: { message, lock } }
  const [gameResult, setGameResult] = useState(null) // { key: gameId, game | null }
  const [lineupTeams, setLineupTeams] = useState(null) // { key: gameId, teams }
  const [imageResult, setImageResult] = useState(null) // { key, status: 'saving' | 'saved' } | { key, error }
  const pending = useRef(false)
  const imagePending = useRef(false)
  const teams = stateTeams ?? (lineupTeams?.key === gameId ? lineupTeams.teams : null)

  const current = result?.key === requestKey ? result : null
  const saved = current?.data ? draftFrom(current.data) : null
  const editing = draft?.key === requestKey ? draft : saved
  const dirty = Boolean(saved && editing && !sameDraft(saved, editing))
  const currentSave = saveResult?.key === requestKey ? saveResult : null
  const saveError = currentSave?.error ?? null
  // true·false는 경기 정보로 안 것이고, null은 경기 정보를 못 받은 것(BE 응답에 맡긴다), undefined는 아직 모름
  const game = gameResult?.key === gameId ? gameResult.game : null
  const isHost = gameResult?.key === gameId ? (gameResult.game ? gameResult.game.isHost === true : null) : undefined
  const locked = Boolean(saveError?.lock)
  const readOnly = locked || isHost === false
  const unsaved = dirty && !readOnly
  const currentImage = imageResult?.key === requestKey ? imageResult : null
  const savingImage = currentImage?.status === 'saving'
  const gameTitle = game?.title ?? stateTitle

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

  // 파티장 여부·제목·일시. 못 받으면 null로 두고 저장 권한은 BE 응답에 맡긴다.
  useEffect(() => {
    if (gameId === null) return
    let active = true

    getGame(gameId)
      .then((data) => {
        if (active) setGameResult({ key: gameId, game: data })
      })
      .catch(() => {
        if (active) setGameResult({ key: gameId, game: null })
      })

    return () => {
      active = false
    }
  }, [gameId])

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
      const failure = saveErrorOf(error)
      // 저장할 수 없게 됐으면 저장되지 않은 배치 대신 저장된 배치를 보여준다
      if (failure.lock) setDraft(null)
      setSaveResult({ key: requestKey, error: failure })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  // 라인업의 모든 팀 배치를 한 장의 PNG로 내려받는다(#57, BE #75). 서버에는 저장된 배치만 있으므로
  // 저장하지 않은 배치가 있으면 막는다. 팀 목록을 못 받았으면 지금 팀만 그린다.
  async function handleSaveImage() {
    if (imagePending.current || unsaved || !current?.data) return
    imagePending.current = true
    const key = requestKey
    setImageResult({ key, status: 'saving' })
    try {
      const shown = current.data
      const list = teams?.length ? teams : [{ teamId }]
      const tactics = await Promise.all(
        list.map((team) => (team.teamId === teamId ? shown : getTactic(gameId, team.teamId))),
      )
      const title = `${gameTitle ?? `경기 #${gameId}`} 전술 배치도`
      const blob = await renderTacticImage(tacticImageLayout(tactics, title))
      downloadBlob(blob, tacticImageFileName(gameId))
      setImageResult({ key, status: 'saved' })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      setImageResult({ key, error: imageErrorMessage(error) })
    } finally {
      imagePending.current = false
    }
  }

  const backTo = `/games/${gameId}/lineup`
  const backLink = gameId !== null && (
    <Link className={styles.back} to={backTo} onClick={confirmLeave}>
      <ArrowLeftIcon size={18} />
      {gameTitle ?? '경기 상세'}
    </Link>
  )

  let eyebrow = null
  if (game) eyebrow = `${game.title} · ${dateTimeLabel(game.playDate)}`
  else if (stateTitle) eyebrow = stateTitle
  else if (gameId !== null) eyebrow = `경기 #${gameId}`

  const tactic = current?.data ?? null
  const multiTeam = teams?.length > 1
  let lead = '포메이션을 고르고 선수를 자리에 놓아요. 팀을 확정하기 전까지 바꿀 수 있어요.'
  if (isHost === false) lead = '파티장만 배치를 바꿀 수 있어요. 저장된 배치를 보여드려요.'
  else if (readOnly) lead = '저장된 배치를 보여드려요.'

  const teamTabs = multiTeam && (
    <section className={styles.card} aria-labelledby="tactic-team-title">
      <h2 id="tactic-team-title" className={styles.cardTitle}>팀</h2>
      <nav className={styles.segmented} aria-label="팀 선택">
        {teams.map((team) => (
          <Link
            key={team.teamId}
            className={styles.segment}
            to={`/games/${gameId}/teams/${team.teamId}/tactic`}
            state={location.state}
            aria-current={team.teamId === teamId ? 'page' : undefined}
            onClick={confirmLeave}
          >
            {team.name}
          </Link>
        ))}
      </nav>
    </section>
  )

  let body
  if (gameId === null || teamId === null) {
    body = (
      <StateCard
        icon={<PinIcon size={22} />}
        title="주소가 올바르지 않아요"
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        경기 목록에서 다시 선택해 주세요.
      </StateCard>
    )
  } else if (!current || isHost === undefined) {
    body = (
      <p className={styles.message} role="status">
        전술 배치도를 불러오는 중…
      </p>
    )
  } else if (current.error) {
    body = (
      <div className={styles.message}>
        <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 불러오기
        </Button>
      </div>
    )
  } else if (tactic.members.length === 0) {
    body = (
      <div className={styles.stack}>
        {teamTabs}
        <StateCard icon={<PinIcon size={22} />} title="배정된 선수가 없어요">
          이 팀에 배정된 선수가 없어서 배치할 수 없어요.
        </StateCard>
      </div>
    )
  } else {
    const formationNames = FORMATION_NAMES.includes(editing.formation)
      ? FORMATION_NAMES
      : [...FORMATION_NAMES, editing.formation]
    const showImage = isHost === true
    const savedNow = currentSave?.saved && !dirty
    const footer =
      !readOnly || showImage || saveError ? (
        <>
          {(!readOnly || saveError || savedNow) && (
            <div className={styles.saveBar}>
              <ErrorMessage>{saveError?.message}</ErrorMessage>
              {savedNow && <p className={styles.saved} role="status">저장했어요.</p>}
              {!readOnly && (
                <div className={styles.actions}>
                  {dirty && (
                    <Button variant="secondary" fit="auto" onClick={() => updateDraft(saved)} disabled={saving}>
                      되돌리기
                    </Button>
                  )}
                  <Button size="lg" onClick={handleSave} disabled={saving || (!dirty && tactic.formation !== null)}>
                    {saving ? '저장 중…' : '배치 저장'}
                  </Button>
                </div>
              )}
            </div>
          )}
          {showImage && (
            <div className={styles.imageBlock}>
              <Button variant="secondary" onClick={handleSaveImage} disabled={savingImage || unsaved}>
                <DownloadIcon size={18} />
                {savingImage ? '이미지 만드는 중…' : '이미지 저장 (PNG)'}
              </Button>
              <p className={styles.note}>
                {unsaved
                  ? '배치를 저장한 뒤 이미지로 받을 수 있어요.'
                  : `${multiTeam ? '모든 팀' : '이 팀'}의 저장된 배치를 PNG 한 장으로 내려받아요.`}
              </p>
              <ErrorMessage>{currentImage?.error}</ErrorMessage>
              {currentImage?.status === 'saved' && (
                <p className={styles.saved} role="status">이미지를 내려받았어요.</p>
              )}
            </div>
          )}
        </>
      ) : null

    body = (
      <TacticBoard
        members={tactic.members}
        formation={editing.formation}
        formationNames={formationNames}
        placements={editing.placements}
        onChange={(placements) => updateDraft({ placements })}
        onFormationChange={(name) =>
          updateDraft({ formation: name, placements: changeFormation(editing.placements, name) })
        }
        teamName={tactic.name}
        teamTabs={teamTabs}
        footer={footer}
        editable={!readOnly}
      />
    )
  }

  return (
    <main className={styles.page}>
      {backLink}
      <header className={styles.header}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>
          {tactic && !multiTeam ? `${tactic.name} 전술 배치도` : '전술 배치도'}
        </h1>
        {gameId !== null && teamId !== null && tactic && <p className={styles.lead}>{lead}</p>}
      </header>
      {body}
    </main>
  )
}
