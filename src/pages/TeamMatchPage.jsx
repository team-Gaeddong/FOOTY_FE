import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers } from '../api/games.js'
import { confirmLineup, createLineup, getLatestLineup, updateLineupTeams } from '../api/lineups.js'
import { getMyProfile } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { ArrowLeftIcon, CheckIcon, LockIcon, PinIcon, SwapIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { TeamBalance } from './TeamBalance.jsx'
import { TeamColumn } from './TeamColumn.jsx'
import { countUnratedPlayers, parseGameId } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
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
import { methodLabel } from './lineupView.js'
import styles from './TeamMatchPage.module.css'

const LEAVE_CONFIRM = '저장하지 않은 팀 변경이 있어요. 저장하지 않고 나갈까요?'

// 팀 짜기(/games/:gameId/lineup/edit, 시안 Lineup). 파티장이 실력 순으로 두 팀을 나누고(POST lineups),
// 선수를 다른 팀으로 옮겨 다듬은 뒤(PUT lineups/latest/teams, 저장하기 전에는 화면에만 있다) 팀을 확정한다(PATCH confirm).
// 읽기 화면은 라인업 탭이고 이 화면은 파티장 전용이다. 권한은 노출만 조절하고 최종 판단은 BE 응답(403)을 따른다.
export function TeamMatchPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const numericId = parseGameId(gameId)

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${numericId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, game, lineup, players, memberId } | { key, error }
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
  const game = current?.game ?? null
  const lineup = current?.lineup ?? null
  const players = current?.players ?? null
  const isHost = game?.isHost === true
  const moves = lineup && edit.lineupId === lineup.lineupId ? edit.moves : NO_MOVES
  const canEdit = canEditLineup({ lineup, isHost, gameStatus: game?.status, locked })
  const viewTeams = lineup ? applyMoves(lineup.teams, moves) : []
  const changeCount = lineup ? countChanges(lineup.teams, moves) : 0
  const emptyTeams = lineup ? findEmptyTeams(lineup.teams, moves) : []
  const balance = lineup && isHost ? teamBalance(viewTeams) : null
  const unsaved = changeCount > 0
  const myGamePlayerId =
    players && current?.memberId != null
      ? (players.find((player) => player.memberId === current.memberId)?.id ?? null)
      : null

  useEffect(() => {
    if (numericId === null) return
    let active = true

    Promise.all([
      getGame(numericId),
      getLatestLineup(numericId).catch((error) => {
        if (error.code === 'LINEUP_404_2') return null
        throw error
      }),
      listGamePlayers(numericId).then((data) => data.players).catch(() => null),
      getMyProfile().then((profile) => profile.memberId ?? null).catch(() => null),
    ])
      .then(([gameData, lineupData, playerData, memberId]) => {
        if (active) {
          setResult({ key: requestKey, game: gameData, lineup: lineupData, players: playerData, memberId })
        }
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
  }, [numericId, requestKey, navigate, clearSession])

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

  function handleMemberGone() {
    navigate('/login', { replace: true, state: { error: 'member_not_found' } })
    startTransition(() => clearSession())
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

  // 저장에 실패한 이유가 최신 라인업을 다시 봐야 하는 경우다. 팀 확정이면 불러오지 못해도 확정으로 표시한다.
  async function reloadLatestLineup(failure) {
    try {
      const latest = await getLatestLineup(numericId)
      setResult((previous) => ({ ...previous, lineup: latest }))
      setEdit({ lineupId: latest.lineupId, moves: NO_MOVES })
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
      const data = await updateLineupTeams(numericId, buildTeamsRequest(lineup.teams, moves))
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
    if (pending.current || numericId === null) return
    pending.current = true
    setCreating(true)
    setCreateError('')
    try {
      const data = await createLineup(numericId)
      setResult({ ...current, lineup: data })
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
      const confirmed = await confirmLineup(numericId)
      setResult({ ...current, lineup: confirmed, game: { ...game, status: 'CONFIRMED' } })
      setEdit({ lineupId: confirmed.lineupId, moves: NO_MOVES })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') return handleMemberGone()
      setConfirmError(actionErrorMessage(error, 'confirm'))
    } finally {
      pending.current = false
      setConfirming(false)
    }
  }

  let content
  if (numericId === null || (current?.error instanceof ApiError && current.error.code === 'GAME_404_1')) {
    content = (
      <StateCard
        icon={<PinIcon size={22} />}
        title={numericId === null ? '경기 주소가 올바르지 않아요' : '경기를 찾을 수 없어요'}
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        {numericId === null ? '경기 목록에서 다시 선택해 주세요.' : '삭제됐거나 없는 경기예요.'}
      </StateCard>
    )
  } else if (!current) {
    content = (
      <p className={styles.message} role="status">
        팀 구성을 불러오는 중…
      </p>
    )
  } else if (current.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{actionErrorMessage(current.error, 'load')}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 시도
        </Button>
      </div>
    )
  } else if (!isHost) {
    content = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="파티장만 볼 수 있어요"
        actions={
          <Button as={Link} to={`/games/${numericId}/lineup`} variant="secondary" fit="auto">
            라인업 보기
          </Button>
        }
      >
        팀을 짜고 고치는 화면은 파티장만 쓸 수 있어요. 팀 구성은 라인업 탭에서 볼 수 있어요.
      </StateCard>
    )
  } else if (!lineup) {
    const blocker = createBlocker({
      playerCount: game.playerCount,
      unrated: players ? countUnratedPlayers(players) : null,
    })
    const unratedCount = players ? countUnratedPlayers(players) : 0
    content = (
      <section className={styles.card} aria-labelledby="start-title">
        <h2 id="start-title" className={styles.cardTitle}>
          실력에 맞춰 두 팀으로 나눠요
        </h2>
        <ul className={styles.rules}>
          <li>
            <CheckIcon size={16} />
            <span>실력 점수가 높은 선수부터 A팀·B팀에 번갈아 배정해요.</span>
          </li>
          <li>
            <CheckIcon size={16} />
            <span>포지션은 선수의 1순위 희망 포지션으로 정해요.</span>
          </li>
          <li>
            <CheckIcon size={16} />
            <span>참가 정원을 넘는 선수는 후보가 돼요.</span>
          </li>
        </ul>
        {game.status !== 'RECRUITING' ? (
          <p className={styles.hint}>모집이 끝난 경기라 팀을 짤 수 없어요.</p>
        ) : (
          <>
            {blocker === 'few' && <p className={styles.hint}>참가한 선수가 2명 이상이어야 팀을 짤 수 있어요.</p>}
            {blocker === 'unrated' && (
              <p className={styles.hint}>
                실력 점수가 없는 선수가 {unratedCount}명 있어요.{' '}
                <Link className={styles.inlineLink} to={`/games/${numericId}/players`}>
                  선수 관리에서 실력 매기기
                </Link>
              </p>
            )}
            <ErrorMessage>{createError}</ErrorMessage>
            <Button size="lg" onClick={handleCreate} disabled={creating || blocker !== null}>
              <SwapIcon size={18} />
              {creating ? '팀 짜는 중…' : '팀 짜기'}
            </Button>
          </>
        )}
      </section>
    )
  } else {
    const [first, second] = lineup.teams
    const tacticState = {
      gameId: numericId,
      gameTitle: game.title,
      hostId: game.host.id,
      teams: lineup.teams.map(({ teamId, name }) => ({ teamId, name })),
    }
    const failure = outcome?.error
    const emptyNames = emptyTeams.map((team) => team.name).join('·')
    content = (
      <>
        <div className={styles.chips}>
          {methodLabel(lineup.method) && <Badge tone="gray">{methodLabel(lineup.method)}</Badge>}
          <Badge tone="gray">버전 {lineup.version}</Badge>
          <Badge tone={lineup.isConfirmed ? 'navy' : 'red'}>{lineup.isConfirmed ? '확정' : '미확정'}</Badge>
        </div>

        {balance && <TeamBalance teams={viewTeams} balance={balance} />}

        {canEdit && unsaved && (
          <div className={styles.banner} role="status">
            <div className={styles.bannerText}>
              <p className={styles.bannerTitle}>저장하지 않은 변경 {changeCount}건</p>
              <p className={styles.bannerDescription}>
                저장하면 옮긴 선수의 전술 배치가 해제돼요. 저장한 뒤 배치도를 다시 짜 주세요.
              </p>
            </div>
            <div className={styles.bannerButtons}>
              <Button variant="secondary" fit="auto" className={styles.revert} onClick={handleRevert} disabled={saving}>
                되돌리기
              </Button>
              <Button fit="auto" onClick={handleSaveTeams} disabled={saving || emptyTeams.length > 0}>
                {saving ? '저장하는 중…' : '변경 저장'}
              </Button>
            </div>
          </div>
        )}
        {canEdit && emptyTeams.length > 0 && (
          <ErrorMessage>{`${emptyNames}에 선수가 없어요. 한 팀에 선수가 1명 이상 있어야 저장할 수 있어요.`}</ErrorMessage>
        )}
        <ErrorMessage>{failure?.message}</ErrorMessage>
        {outcome?.savedCount && !unsaved && (
          <p className={styles.saved} role="status">
            {outcome.savedCount}명을 옮겨 팀 구성을 저장했어요.
          </p>
        )}

        <div className={styles.teams}>
          {viewTeams.map((team) => (
            <TeamColumn
              key={team.teamId}
              team={team}
              otherTeams={lineup.teams.filter((other) => other.teamId !== team.teamId)}
              editable={canEdit}
              moveDisabled={saving}
              onMove={handleMove}
              myGamePlayerId={myGamePlayerId}
              tactic={{ to: `/games/${numericId}/teams/${team.teamId}/tactic`, state: tacticState }}
              onLeave={confirmLeave}
            />
          ))}
        </div>

        {lineup.isConfirmed ? (
          <section className={styles.confirm} aria-labelledby="confirmed-title">
            <div className={styles.confirmText}>
              <p id="confirmed-title" className={styles.confirmTitle}>
                팀이 확정됐어요
              </p>
              <p className={styles.confirmDescription}>
                팀과 전술은 더 수정할 수 없어요. 경기를 마치면 라인업 탭에서 경기를 종료할 수 있어요.
              </p>
            </div>
            <Button as={Link} to={`/games/${numericId}/lineup`} variant="secondary" size="lg" fit="responsive">
              라인업 보기
            </Button>
          </section>
        ) : (
          <section className={styles.confirm} aria-labelledby="confirm-title">
            <div className={styles.confirmText}>
              <p id="confirm-title" className={styles.confirmTitle}>
                이대로 팀을 확정할까요?
              </p>
              <p className={styles.confirmDescription}>
                확정하면 팀과 전술을 더 수정할 수 없어요. 확정한 뒤에 경기를 종료할 수 있어요.
              </p>
              {unsaved && (
                <p className={styles.hint} role="status">
                  옮긴 변경을 저장하거나 되돌린 뒤 확정할 수 있어요.
                </p>
              )}
              <ErrorMessage>{confirmError}</ErrorMessage>
            </div>
            <Button
              variant="secondary"
              size="lg"
              fit="responsive"
              onClick={handleConfirm}
              disabled={confirming || saving || unsaved || !first || !second}
            >
              {confirming ? '확정하는 중…' : '팀 확정'}
            </Button>
          </section>
        )}
      </>
    )
  }

  return (
    <main className={styles.page}>
      {numericId !== null && (
        <Link className={styles.back} to={`/games/${numericId}`} onClick={confirmLeave}>
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
        <h1 className={styles.title}>팀 짜기</h1>
        <p className={styles.lead}>
          {lineup?.isConfirmed
            ? '팀이 확정됐어요.'
            : lineup
              ? '실력 순으로 A·B팀에 번갈아 나눴어요. 선수를 옮겨 직접 다듬을 수 있어요.'
              : '참가 선수의 실력 점수로 두 팀을 나눠요.'}
        </p>
      </header>
      {content}
    </main>
  )
}
