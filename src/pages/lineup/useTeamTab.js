import { startTransition, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { listGamePlayers } from '../../api/games.js'
import { confirmLineup, createLineup, getLatestLineup, updateLineupTeams } from '../../api/lineups.js'
import { getMyProfile } from '../../api/member.js'
import { getTactic } from '../../api/tactics.js'
import { useAuth } from '../../auth/useAuth.js'
import { countUnratedPlayers } from '../gameDetail/gameDetail.js'
import {
  NO_MOVES,
  actionErrorMessage,
  applyMoves,
  buildTeamsRequest,
  canEditLineup,
  countChanges,
  createBlocker,
  findEmptyTeams,
  movePlayer,
  saveErrorOf,
  teamBalance,
} from './lineupEdit.js'
import { isNoLineup } from './lineupView.js'

const LEAVE_CONFIRM = '저장하지 않은 팀 변경이 있어요. 저장하지 않고 나갈까요?'

async function loadTactics(gameId, lineup) {
  // 배치를 못 받은 팀은 null이라 배치도 없이 선수 목록만 보여 준다.
  return Promise.all(lineup.teams.map((team) => getTactic(gameId, team.teamId).catch(() => null)))
}

// 팀 탭(시안 Lineup·DetailLineup)의 데이터와 동작. 파티장은 이 탭에서 팀을 짜고(POST lineups), 선수를 옮겨 다듬고
// (PUT lineups/latest/teams, 저장하기 전에는 화면에만 있다), 팀을 확정한다(PATCH confirm). 참가자는 읽기만 한다.
// 권한은 노출만 조절하고 최종 판단은 BE 응답(403)을 따른다. 경기(game)는 경기 상세 틀이 주고, 경기가 바뀌면 onUpdated로 알린다.
export function useTeamTab({ game, onUpdated }) {
  const gameId = game.id
  const navigate = useNavigate()
  const { clearSession } = useAuth()

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, lineup, tactics, players, memberId } | { key, error }
  const [edit, setEdit] = useState({ lineupId: null, moves: NO_MOVES })
  const [outcome, setOutcome] = useState(null) // { error } | { savedCount }
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [createError, setCreateError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const loaded = current && !current.error ? current : null
  const lineup = loaded?.lineup ?? null
  const players = loaded?.players ?? null
  const isHost = game.isHost === true
  const moves = lineup && edit.lineupId === lineup.lineupId ? edit.moves : NO_MOVES
  const canEdit = canEditLineup({ lineup, isHost, gameStatus: game.status, locked })
  const viewTeams = lineup ? applyMoves(lineup.teams, moves) : []
  const changeCount = lineup ? countChanges(lineup.teams, moves) : 0
  const emptyTeams = lineup ? findEmptyTeams(lineup.teams, moves) : []
  const balance = lineup && isHost ? teamBalance(viewTeams) : null
  const unsaved = changeCount > 0
  const myGamePlayerId =
    players && loaded?.memberId != null
      ? (players.find((player) => player.memberId === loaded.memberId)?.id ?? null)
      : null
  const unrated = players ? countUnratedPlayers(players) : null
  const blocker = createBlocker({ playerCount: game.playerCount, unrated })

  useEffect(() => {
    let active = true

    Promise.all([
      getLatestLineup(gameId)
        .then(async (lineupData) => ({ lineup: lineupData, tactics: await loadTactics(gameId, lineupData) }))
        .catch((error) => {
          if (isNoLineup(error)) return { lineup: null, tactics: [] }
          throw error
        }),
      listGamePlayers(gameId).then((data) => data.players).catch(() => null),
      getMyProfile().then((profile) => profile.memberId ?? null).catch(() => null),
    ])
      .then(([lineupData, playerData, memberId]) => {
        if (active) setResult({ key: requestKey, ...lineupData, players: playerData, memberId })
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

  // 새로고침·탭 닫기 경고. BrowserRouter는 화면 안 이동을 막는 기능(useBlocker)이 없어
  // 이 탭의 링크(경기 탭·전술 배치도)는 confirmLeave로 직접 묻고, 브라우저 뒤로 가기는 막지 못한다.
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

  function handleMemberGone() {
    navigate('/login', { replace: true, state: { error: 'member_not_found' } })
    startTransition(() => clearSession())
  }

  // 확정된 팀은 배치도를 그려야 하므로 팀을 바꾼 뒤에는 배치를 다시 받는다(저장하면 옮긴 선수의 배치가 BE에서 해제된다).
  async function refreshTactics(latest) {
    const tactics = await loadTactics(gameId, latest)
    setResult((previous) => (previous?.key === requestKey && !previous.error ? { ...previous, tactics } : previous))
  }

  function handleMove(gamePlayerId, toTeamId) {
    if (!lineup || !canEdit || saving) return
    // 빠르게 연달아 눌러도 앞의 이동이 사라지지 않도록 직전 상태에서 이어 간다.
    setEdit((previous) => {
      const base = previous.lineupId === lineup.lineupId ? previous.moves : NO_MOVES
      return { lineupId: lineup.lineupId, moves: movePlayer(lineup.teams, base, gamePlayerId, toTeamId) }
    })
    setOutcome(null)
  }

  function handleRevert() {
    if (saving) return
    setEdit({ lineupId: lineup?.lineupId ?? null, moves: NO_MOVES })
    setOutcome(null)
  }

  // 저장에 실패한 이유가 최신 팀 구성을 다시 봐야 하는 경우다. 팀 확정이면 불러오지 못해도 확정으로 표시한다.
  async function reloadLatestLineup(failure) {
    try {
      const latest = await getLatestLineup(gameId)
      setResult((previous) => ({ ...previous, lineup: latest }))
      setEdit({ lineupId: latest.lineupId, moves: NO_MOVES })
      if (latest.isConfirmed) void refreshTactics(latest)
    } catch {
      if (failure.confirmed && lineup) {
        setResult((previous) => ({ ...previous, lineup: { ...lineup, isConfirmed: true } }))
        setEdit({ lineupId: lineup.lineupId, moves: NO_MOVES })
      }
    }
  }

  async function handleSaveTeams() {
    if (pending.current || !lineup || !canEdit || changeCount === 0 || emptyTeams.length > 0) return
    pending.current = true
    setSaving(true)
    setOutcome(null)
    try {
      const data = await updateLineupTeams(gameId, buildTeamsRequest(lineup.teams, moves))
      setResult({ ...current, lineup: data })
      setEdit({ lineupId: data.lineupId, moves: NO_MOVES })
      setOutcome({ savedCount: changeCount })
    } catch (error) {
      const failure = saveErrorOf(error)
      if (failure.logout) return handleMemberGone()
      setOutcome({ error: failure })
      if (failure.lock) setLocked(true)
      if (failure.reload) await reloadLatestLineup(failure)
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (pending.current) return
    pending.current = true
    setCreating(true)
    setCreateError('')
    try {
      const data = await createLineup(gameId)
      setResult({ ...current, lineup: data, tactics: data.teams.map(() => null) })
      setEdit({ lineupId: data.lineupId, moves: NO_MOVES })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') return handleMemberGone()
      setCreateError(actionErrorMessage(error, 'create'))
    } finally {
      pending.current = false
      setCreating(false)
    }
  }

  async function handleConfirm() {
    if (pending.current || !lineup || lineup.isConfirmed || !isHost || unsaved) return
    pending.current = true
    setConfirming(true)
    setConfirmError('')
    try {
      const confirmed = await confirmLineup(gameId)
      setResult({ ...current, lineup: confirmed })
      setEdit({ lineupId: confirmed.lineupId, moves: NO_MOVES })
      onUpdated({ ...game, status: 'CONFIRMED' })
      void refreshTactics(confirmed)
    } catch (error) {
      if (error.code === 'MEMBER_404_1') return handleMemberGone()
      setConfirmError(actionErrorMessage(error, 'confirm'))
    } finally {
      pending.current = false
      setConfirming(false)
    }
  }

  return {
    // 불러오기: current가 null이면 불러오는 중, current.error가 있으면 실패
    current,
    retry: () => setRetryCount((count) => count + 1),
    lineup,
    tactics: loaded?.tactics ?? [],
    isHost,
    // 편집
    canEdit,
    viewTeams,
    changeCount,
    emptyTeams,
    balance,
    unsaved,
    myGamePlayerId,
    outcome,
    saving,
    onMove: handleMove,
    onRevert: handleRevert,
    onSave: handleSaveTeams,
    confirmLeave,
    // 팀 짜기
    blocker,
    unrated,
    creating,
    createError,
    onCreate: handleCreate,
    // 확정
    confirming,
    confirmError,
    onConfirm: handleConfirm,
  }
}
