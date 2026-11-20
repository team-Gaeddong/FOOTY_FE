import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { listGames } from '../api/games.js'
import { getMyProfile } from '../api/members.js'
import { confirmLineup, createLineup, getLatestLineup, updateLineupTeams } from '../api/lineups.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { POSITION_LABELS } from '../components/positions.js'
import {
  NO_MOVES,
  applyMoves,
  buildTeamsRequest,
  canEditLineup,
  countChanges,
  findEmptyTeams,
  movePlayer,
  previewTotalSkill,
  saveErrorOf,
  toTeamLabel,
} from './lineupEdit.js'
import styles from './TeamMatchPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 팀 변경이 있어요. 저장하지 않고 나갈까요?'

// 팀 직접 수정 상태. 경기(gameId)마다 따로 둔다. moves는 lineupEdit.js의 초안이다.
const IDLE_EDIT = Object.freeze({
  gameId: null,
  active: false,
  locked: false,
  lineupId: null,
  moves: NO_MOVES,
  result: null, // { error } | { savedCount }
})

function errorMessage(error, action) {
  if (!(error instanceof ApiError)) {
    if (action === 'confirm') return '경기를 저장하지 못했습니다. 다시 시도해 주세요.'
    if (action === 'load') return '팀 구성을 불러오지 못했습니다. 다시 시도해 주세요.'
    return '팀을 짜지 못했습니다. 다시 시도해 주세요.'
  }
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GAME_403_1') return action === 'confirm' ? '파티장만 경기를 저장할 수 있어요.' : '파티장만 팀을 짤 수 있어요.'
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요. 목록에서 다시 확인해 주세요.'
  if (error.code === 'GAME_409_1') return '모집 중인 경기에서만 저장할 수 있어요.'
  if (error.code === 'LINEUP_409_1') return '이미 팀을 짠 경기예요.'
  if (error.code === 'LINEUP_409_2') return '실력 점수가 없는 선수가 있어요. 모든 선수의 실력을 매긴 뒤 다시 시도해 주세요.'
  if (error.code === 'LINEUP_409_3') return '팀을 짜려면 참가 선수가 2명 이상이어야 해요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 팀을 짤 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (action === 'confirm') return '경기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (action === 'load') return '팀 구성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  return '팀을 짜지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

async function findHostId(gameId) {
  for (let page = 0; ; page += 1) {
    const { games, totalPages } = await listGames({ page, size: 100 })
    const game = games.find((candidate) => candidate.id === gameId)
    if (game) return game.hostId
    if (page + 1 >= totalPages) return null
  }
}

export function TeamMatchPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const numericId = Number(gameId)
  const validId = /^\d+$/.test(gameId ?? '') && Number.isSafeInteger(numericId) && numericId > 0
  const game = location.state?.game?.id === numericId ? location.state.game : null
  const [submitError, setSubmitError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [hostResult, setHostResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [lineupResult, setLineupResult] = useState(null)
  const [lineupOverride, setLineupOverride] = useState(null)
  const [editState, setEditState] = useState(IDLE_EDIT)
  const [savingTeams, setSavingTeams] = useState(false)
  const pending = useRef(false)
  const requestKey = `${numericId}:${retryCount}`
  const isHost = hostResult?.gameId === numericId ? hostResult.isHost : null
  const currentLineupResult = lineupResult?.key === requestKey ? lineupResult : null
  const currentLineupOverride = lineupOverride?.gameId === numericId ? lineupOverride.data : null
  const lineup = currentLineupOverride ?? currentLineupResult?.data ?? null
  const loadingLineup = validId && !currentLineupResult
  const loadError = currentLineupResult?.error ?? ''

  // 팀 직접 수정: 파티장이 팀 확정 전에 선수를 다른 팀으로 옮긴다. 옮긴 내용은 저장 전까지 화면에만 있다.
  // 경기 상태를 아직 모르면(주소로 바로 들어옴) 모집 중인지는 BE 응답(409)에 맡긴다.
  const edit = editState.gameId === numericId ? editState : IDLE_EDIT
  const moves = lineup && edit.lineupId === lineup.lineupId ? edit.moves : NO_MOVES
  const canEdit = canEditLineup({ lineup, isHost, gameStatus: game?.status, locked: edit.locked })
  const editMode = canEdit && edit.active
  const changeCount = lineup && editMode ? countChanges(lineup.teams, moves) : 0
  const emptyTeams = lineup && editMode ? findEmptyTeams(lineup.teams, moves) : []
  const viewTeams = lineup ? (editMode ? applyMoves(lineup.teams, moves) : lineup.teams) : []
  const unsaved = changeCount > 0

  useEffect(() => {
    if (!validId) return
    let active = true

    getLatestLineup(numericId)
      .then((data) => {
        if (active) setLineupResult({ key: requestKey, data })
      })
      .catch((error) => {
        if (!active) return
        if (error.code === 'LINEUP_404_2') {
          setLineupResult({ key: requestKey, data: null })
          return
        }
        setLineupResult({ key: requestKey, error: errorMessage(error, 'load') })
      })

    return () => {
      active = false
    }
  }, [numericId, requestKey, validId])

  useEffect(() => {
    if (!validId) return
    let active = true

    Promise.all([
      getMyProfile(),
      game?.hostId ?? findHostId(numericId),
    ])
      .then(([profile, hostId]) => {
        if (active) setHostResult({ gameId: numericId, isHost: hostId === profile.memberId })
      })
      .catch(() => {
        if (active) setHostResult({ gameId: numericId, isHost: false })
      })

    return () => {
      active = false
    }
  }, [game?.hostId, numericId, validId])

  // 새로고침·탭 닫기 경고. BrowserRouter는 화면 안 이동을 막는 기능(useBlocker)이 없어
  // 이 화면의 링크는 confirmLeave로 직접 묻고, 브라우저 뒤로 가기는 막지 못한다(TacticPage와 같은 방식).
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

  function patchEdit(targetGameId, patch) {
    setEditState((previous) => ({
      ...(previous.gameId === targetGameId ? previous : IDLE_EDIT),
      gameId: targetGameId,
      ...patch,
    }))
  }

  function handleStartEdit() {
    if (!lineup || !canEdit) return
    patchEdit(numericId, { active: true, lineupId: lineup.lineupId, moves: NO_MOVES, result: null })
  }

  function handleCloseEdit() {
    if (savingTeams || unsaved) return
    patchEdit(numericId, { active: false, result: null })
  }

  function handleMove(gamePlayerId, toTeamId) {
    if (!lineup || !editMode || savingTeams) return
    // 빠르게 연달아 눌러도 앞의 이동이 사라지지 않도록 직전 상태에서 이어 간다.
    setEditState((previous) => {
      const base = previous.gameId === numericId ? previous : IDLE_EDIT
      const baseMoves = base.lineupId === lineup.lineupId ? base.moves : NO_MOVES
      return {
        ...base,
        gameId: numericId,
        lineupId: lineup.lineupId,
        moves: movePlayer(lineup.teams, baseMoves, gamePlayerId, toTeamId),
        result: null,
      }
    })
  }

  function handleRevert() {
    if (savingTeams) return
    patchEdit(numericId, { moves: NO_MOVES, result: null })
  }

  // 저장에 실패한 이유가 최신 라인업을 다시 봐야 하는 경우다. 팀 확정이면 불러오지 못해도 확정으로 표시한다.
  async function reloadLatestLineup(targetGameId, failure) {
    try {
      const latest = await getLatestLineup(targetGameId)
      setLineupOverride({ gameId: targetGameId, data: latest })
      patchEdit(targetGameId, { moves: NO_MOVES, lineupId: latest.lineupId })
    } catch {
      if (failure.confirmed && lineup) {
        setLineupOverride({ gameId: targetGameId, data: { ...lineup, isConfirmed: true } })
        patchEdit(targetGameId, { moves: NO_MOVES })
      }
    }
  }

  async function handleSaveTeams() {
    if (pending.current || !validId || !lineup || !editMode || changeCount === 0 || emptyTeams.length > 0) return

    pending.current = true
    setSavingTeams(true)
    patchEdit(numericId, { result: null })
    try {
      const data = await updateLineupTeams(numericId, buildTeamsRequest(lineup.teams, moves))
      setLineupOverride({ gameId: numericId, data })
      patchEdit(numericId, { moves: NO_MOVES, lineupId: data.lineupId, result: { savedCount: changeCount } })
    } catch (error) {
      const failure = saveErrorOf(error)
      if (failure.logout) {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      patchEdit(numericId, { result: { error: failure }, ...(failure.lock ? { locked: true } : {}) })
      if (failure.reload) await reloadLatestLineup(numericId, failure)
    } finally {
      pending.current = false
      setSavingTeams(false)
    }
  }

  async function handleCreate() {
    if (pending.current || !validId) return

    pending.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      setLineupOverride({ gameId: numericId, data: await createLineup(numericId) })
    } catch (error) {
      setSubmitError(errorMessage(error, 'create'))
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  async function handleConfirm() {
    if (pending.current || !validId || !lineup || lineup.isConfirmed || !isHost || unsaved) return

    pending.current = true
    setConfirming(true)
    setConfirmError('')
    try {
      setLineupOverride({ gameId: numericId, data: await confirmLineup(numericId) })
    } catch (error) {
      setConfirmError(errorMessage(error, 'confirm'))
    } finally {
      pending.current = false
      setConfirming(false)
    }
  }

  if (!validId) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.panel}>
          <h1>경기 주소가 올바르지 않아요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.primaryLink} to="/games">경기 목록 보기</Link>
        </section>
      </PageLayout>
    )
  }

  if (lineup) {
    const tacticState = {
      gameId: numericId,
      gameTitle: game?.title ?? null,
      hostId: game?.hostId ?? null,
      teams: lineup.teams.map(({ teamId, name }) => ({ teamId, name })),
    }
    const teamNames = new Map(lineup.teams.map((team) => [team.teamId, team.name]))
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games" onClick={confirmLeave}>← 경기 목록</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>팀 짜기 완료</p>
          <h1>{game?.title ?? `경기 #${numericId}`}</h1>
          <p>실력이 비슷하도록 두 팀에 번갈아 배정했어요.</p>
        </header>
        <ul className={styles.teams}>
          {viewTeams.map((team) => (
            <li key={team.teamId}>
              <TeamCard
                team={team}
                tacticState={tacticState}
                gameId={numericId}
                onLeave={confirmLeave}
                editing={editMode}
                showPreview={editMode && changeCount > 0}
                teamNames={teamNames}
                otherTeams={lineup.teams.filter((other) => other.teamId !== team.teamId)}
                moveDisabled={savingTeams}
                onMove={handleMove}
              />
            </li>
          ))}
        </ul>
        {lineup.teams.some((team) => team.totalSkill !== null) && (
          <p className={styles.note}>
            후보 선수는 팀 실력 합계에서 빠져요.
            {editMode && changeCount > 0 && ' 옮긴 뒤의 예상 합계는 저장하면 다시 계산돼요.'}
          </p>
        )}
        <EditPanel
          canEdit={canEdit}
          editMode={editMode}
          teams={viewTeams}
          changeCount={changeCount}
          emptyTeams={emptyTeams}
          saving={savingTeams}
          result={edit.result}
          onStart={handleStartEdit}
          onClose={handleCloseEdit}
          onSave={handleSaveTeams}
          onRevert={handleRevert}
        />
        {lineup.isConfirmed ? (
          <p className={styles.saved} role="status">팀 구성을 저장했어요. 이 경기의 팀과 전술이 확정됐습니다.</p>
        ) : (
          <section className={styles.savePanel} aria-labelledby="save-lineup-title">
            <h2 id="save-lineup-title">팀 구성 저장</h2>
            <p>저장하면 팀 구성이 확정되고 전술을 더 이상 수정할 수 없어요.</p>
            <ErrorMessage>{confirmError}</ErrorMessage>
            {isHost === null ? (
              <p className={styles.note} role="status">저장 권한을 확인하고 있어요.</p>
            ) : isHost ? (
              <>
                {unsaved && (
                  <p className={styles.note} role="status">옮긴 팀 변경을 저장하거나 되돌린 뒤 경기를 저장할 수 있어요.</p>
                )}
                <Button onClick={handleConfirm} disabled={confirming || submitting || savingTeams || unsaved}>
                  {confirming ? '저장 중…' : '경기 저장하기'}
                </Button>
              </>
            ) : (
              <p className={styles.note} role="status">파티장만 경기를 저장할 수 있어요.</p>
            )}
          </section>
        )}
        <Link className={styles.primaryLink} to="/games" onClick={confirmLeave}>경기 목록으로 돌아가기</Link>
      </PageLayout>
    )
  }

  if (loadingLineup) {
    return <PageLayout><p className={styles.loading} role="status">팀 구성을 불러오는 중…</p></PageLayout>
  }

  if (loadError) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.panel}>
          <h1>팀 구성을 불러오지 못했어요</h1>
          <ErrorMessage>{loadError}</ErrorMessage>
          <Button variant="secondary" onClick={() => setRetryCount((count) => count + 1)}>다시 시도</Button>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to="/games">← 경기 목록</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>실력에 맞춰 나눠요</p>
        <h1>팀 짜기</h1>
        <p>참가 선수의 실력 점수로 두 팀을 나눠요.</p>
      </header>

      <section className={styles.panel} aria-labelledby="team-match-game-title">
        <span className={styles.badge}>경기</span>
        <h2 id="team-match-game-title">{game?.title ?? `경기 #${numericId}`}</h2>
        {game && (
          <dl>
            <div><dt>장소</dt><dd>{game.location}</dd></div>
            <div><dt>참가 정원</dt><dd>{game.maxPlayers}명</dd></div>
          </dl>
        )}
        <ul className={styles.rules}>
          <li>실력 점수가 높은 선수부터 A팀·B팀에 번갈아 배정해요.</li>
          <li>포지션은 선수의 1순위 희망 포지션으로 정해요.</li>
          <li>참가 정원을 넘는 선수는 후보가 돼요.</li>
        </ul>
        <Link className={styles.tacticLink} to={`/games/${numericId}/skill-levels`} state={game ? { game } : undefined}>
          선수 실력 매기기 →
        </Link>
        <ErrorMessage>{submitError}</ErrorMessage>
        <Button onClick={handleCreate} disabled={submitting}>
          {submitting ? '팀 짜는 중…' : '팀 짜기'}
        </Button>
      </section>
    </PageLayout>
  )
}

function EditPanel({
  canEdit,
  editMode,
  teams,
  changeCount,
  emptyTeams,
  saving,
  result,
  onStart,
  onClose,
  onSave,
  onRevert,
}) {
  const failure = result?.error
  if (!canEdit) {
    // 저장하다가 팀이 확정됐다는 등 수정을 막은 이유는 수정 모드가 닫힌 뒤에도 알려 준다.
    if (!failure) return null
    return (
      <section className={styles.editPanel} aria-labelledby="edit-teams-title">
        <h2 id="edit-teams-title">팀 직접 수정</h2>
        <ErrorMessage>{failure.message}</ErrorMessage>
      </section>
    )
  }

  if (!editMode) {
    return (
      <section className={styles.editPanel} aria-labelledby="edit-teams-title">
        <h2 id="edit-teams-title">팀 직접 수정</h2>
        <p>자동으로 짠 팀에서 선수를 다른 팀으로 옮길 수 있어요. 저장하기 전에는 바뀌지 않아요.</p>
        <Button variant="secondary" onClick={onStart}>팀 직접 수정하기</Button>
      </section>
    )
  }

  const emptyNames = emptyTeams.map((team) => team.name).join('·')
  return (
    <section className={styles.editPanel} aria-labelledby="edit-teams-title">
      <h2 id="edit-teams-title">팀 직접 수정</h2>
      <p>선수 옆 버튼을 눌러 다른 팀으로 옮겨요. 저장하기 전에는 바뀌지 않아요.</p>
      <p className={changeCount > 0 ? styles.unsaved : styles.noChange} role="status">
        {changeCount > 0 ? `저장하지 않은 변경 ${changeCount}명` : '옮긴 선수가 없어요'}
      </p>
      <ul className={styles.counts} aria-label="팀별 인원">
        {teams.map((team) => (
          <li key={team.teamId}>{team.name} {team.members.length}명</li>
        ))}
      </ul>
      {emptyTeams.length > 0 && (
        <ErrorMessage>{`${emptyNames}에 선수가 없어요. 한 팀에 선수가 1명 이상 있어야 저장할 수 있어요.`}</ErrorMessage>
      )}
      <ErrorMessage>{failure?.message}</ErrorMessage>
      {result?.savedCount && changeCount === 0 && (
        <p className={styles.saved} role="status">{result.savedCount}명을 옮겨 팀 구성을 저장했어요.</p>
      )}
      <div className={styles.editActions}>
        <Button onClick={onSave} disabled={saving || changeCount === 0 || emptyTeams.length > 0}>
          {saving ? '저장하는 중…' : '저장'}
        </Button>
        <Button variant="secondary" onClick={onRevert} disabled={saving || changeCount === 0}>되돌리기</Button>
      </div>
      <Button variant="secondary" onClick={onClose} disabled={saving || changeCount > 0}>수정 끝내기</Button>
      {changeCount > 0 && <p className={styles.note}>저장하거나 되돌린 뒤에 수정을 끝낼 수 있어요.</p>}
    </section>
  )
}

function TeamCard({
  team,
  gameId,
  tacticState,
  onLeave,
  editing,
  showPreview,
  teamNames,
  otherTeams,
  moveDisabled,
  onMove,
}) {
  const skillLabel = showPreview ? '예상 합계' : '실력 합계'
  const skillValue = showPreview ? previewTotalSkill(team.members) : team.totalSkill
  return (
    <article className={styles.teamCard} aria-labelledby={`team-${team.teamId}`}>
      <div className={styles.teamHeader}>
        <h2 id={`team-${team.teamId}`}>{team.name}</h2>
        <div className={styles.teamMeta}>
          {editing && <span className={styles.count}>{team.members.length}명</span>}
          <span className={showPreview ? styles.previewSkill : styles.totalSkill}>
            {skillLabel} {skillValue ?? '-'}
          </span>
        </div>
      </div>
      {team.members.length === 0 ? (
        <p className={styles.empty}>배정된 선수가 없어요.</p>
      ) : (
        <ul className={styles.members}>
          {team.members.map((member) => {
            const moved = member.movedFrom !== undefined
            return (
              <li
                key={member.gamePlayerId}
                className={[member.isSubstitute ? styles.substitute : '', moved ? styles.moved : ''].join(' ')}
              >
                <span className={styles.position}>{member.position}</span>
                <span className={styles.memberName}>
                  {member.name}
                  <span className={styles.positionLabel}>{POSITION_LABELS[member.position] ?? member.position}</span>
                  {moved && <span className={styles.movedTag}>{teamNames.get(member.movedFrom)}에서 옮김</span>}
                </span>
                {member.isSubstitute && <span className={styles.subBadge}>후보</span>}
                <span className={styles.skill}>{member.skillLevel}</span>
                {editing &&
                  otherTeams.map((other) => (
                    <button
                      key={other.teamId}
                      type="button"
                      className={styles.moveButton}
                      aria-label={`${member.name} 선수를 ${toTeamLabel(other.name)} 옮기기`}
                      disabled={moveDisabled}
                      onClick={() => onMove(member.gamePlayerId, other.teamId)}
                    >
                      {toTeamLabel(other.name)}
                    </button>
                  ))}
              </li>
            )
          })}
        </ul>
      )}
      <Link
        className={styles.tacticLink}
        to={`/games/${gameId}/teams/${team.teamId}/tactic`}
        state={tacticState}
        onClick={onLeave}
      >
        전술 배치도 짜기 →
      </Link>
    </article>
  )
}
