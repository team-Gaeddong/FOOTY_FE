import { startTransition, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router'
import { finishGame } from '../../api/games.js'
import { useAuth } from '../../auth/useAuth.js'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { DownloadIcon, LockIcon, PitchIcon, SwapIcon } from '../../components/Icons.jsx'
import { LineupPitch } from '../../components/LineupPitch.jsx'
import { PositionChips } from '../../components/PositionChips.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { downloadBlob, renderTacticImage, tacticImageFileName, tacticImageLayout } from '../../components/tacticImage.js'
import { GameHeader } from '../gameDetail/GameHeader.jsx'
import { TeamBalance } from './TeamBalance.jsx'
import { TeamColumn } from './TeamColumn.jsx'
import { TeamConfirm } from './TeamConfirm.jsx'
import { TeamStatus } from './TeamStatus.jsx'
import {
  canFinish,
  finishErrorMessage,
  lineupErrorMessage,
  lineupNote,
  pitchMarkers,
  teamRows,
  teamStatusView,
} from './lineupView.js'
import { useTeamTab } from './useTeamTab.js'
import styles from './GameLineupPage.module.css'

// 경기 상세의 팀 탭(/games/:gameId/lineup, 시안 Lineup·DetailLineup·States "팀 없음").
// 맨 위에 상태(팀 없음 / 임시 팀 · 조정 중 / 확정된 팀)를 보여 주고, 파티장은 이 탭에서 팀을 짜고 옮기고 확정한다.
// 예전의 별도 "팀 짜기" 화면(/lineup/edit)은 없앴고 그 경로는 이 탭으로 보낸다(App.jsx).
export function GameLineupPage() {
  const { game, onUpdated } = useOutletContext()
  const team = useTeamTab({ game, onUpdated })
  const [finished, setFinished] = useState(false)
  const { current, lineup } = team

  let content
  if (!current) {
    content = (
      <p className={styles.message} role="status">
        팀 구성을 불러오는 중…
      </p>
    )
  } else if (current.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{lineupErrorMessage(current.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={team.retry}>
          다시 시도
        </Button>
      </div>
    )
  } else if (!lineup) {
    content = <TeamStart game={game} team={team} />
  } else {
    const view = teamStatusView({ lineup, isHost: team.isHost })
    content = (
      <div className={styles.content}>
        {finished && (
          <p className={styles.notice} role="status">
            경기를 종료했어요. 이제 밸런스 평가와 MVP 투표를 열 수 있어요.
          </p>
        )}
        <TeamStatus view={view}>
          {view.stage === 'confirmed' && canFinish({ isHost: team.isHost, status: game.status }) && (
            <FinishAction
              gameId={game.id}
              onFinished={(updated) => {
                setFinished(true)
                onUpdated(updated)
              }}
            />
          )}
        </TeamStatus>
        {view.stage === 'confirmed' ? <ConfirmedTeams game={game} team={team} /> : <DraftTeams game={game} team={team} />}
      </div>
    )
  }

  return (
    <>
      <GameHeader
        game={game}
        current="lineup"
        countNote={lineup ? lineupNote(lineup) : undefined}
        onLeave={team.confirmLeave}
      />
      {content}
    </>
  )
}

// 팀 없음(시안 States). 파티장은 모집 중인 경기에서 여기서 바로 팀을 짠다.
function TeamStart({ game, team }) {
  const canCreate = team.isHost && game.status === 'RECRUITING'
  return (
    <StateCard
      icon={<SwapIcon size={22} />}
      title="아직 팀을 짜지 않았어요"
      actions={
        <>
          {canCreate && (
            <Button fit="auto" onClick={team.onCreate} disabled={team.creating || team.blocker !== null}>
              {team.creating ? '팀 짜는 중…' : '팀 짜기'}
            </Button>
          )}
          <span className={styles.code}>LINEUP_404_2</span>
          {team.isHost && <StartHint game={game} team={team} />}
        </>
      }
    >
      파티장이 실력을 모두 입력하고 팀을 짜면 여기에 보여요.
    </StateCard>
  )
}

// 팀을 짤 수 없는 이유와 팀 짜기 실패 안내(파티장)
function StartHint({ game, team }) {
  if (game.status !== 'RECRUITING') {
    return <p className={styles.startHint}>모집이 끝난 경기라 팀을 짤 수 없어요.</p>
  }
  return (
    <>
      {team.blocker === 'few' && (
        <p className={styles.startHint}>참가한 선수가 2명 이상이어야 팀을 짤 수 있어요.</p>
      )}
      {team.blocker === 'unrated' && (
        <p className={styles.startHint}>
          실력 점수가 없는 선수가 {team.unrated}명 있어요.{' '}
          <Link className={styles.inlineLink} to={`/games/${game.id}/players`}>
            선수 관리에서 실력 매기기
          </Link>
        </p>
      )}
      {team.createError && (
        <div className={styles.startHint}>
          <ErrorMessage>{team.createError}</ErrorMessage>
        </div>
      )}
    </>
  )
}

// 임시 팀. 파티장은 예상 합계를 보고 선수를 옮겨 저장한 뒤 확정하고, 참가자는 읽기만 한다.
function DraftTeams({ game, team }) {
  const tacticState = {
    gameId: game.id,
    gameTitle: game.title,
    hostId: game.host.id,
    teams: team.lineup.teams.map(({ teamId, name }) => ({ teamId, name })),
  }
  const failure = team.outcome?.error
  const emptyNames = team.emptyTeams.map((emptyTeam) => emptyTeam.name).join('·')
  const [first, second] = team.lineup.teams

  return (
    <>
      {team.balance && <TeamBalance teams={team.viewTeams} balance={team.balance} />}

      {team.canEdit && team.unsaved && (
        <div className={styles.unsaved} role="status">
          <div className={styles.unsavedText}>
            <p className={styles.unsavedTitle}>저장하지 않은 변경 {team.changeCount}건</p>
            <p className={styles.unsavedDescription}>
              저장하면 옮긴 선수의 전술 배치가 해제돼요. 저장한 뒤 배치도를 다시 짜 주세요.
            </p>
          </div>
          <div className={styles.unsavedButtons}>
            <Button
              variant="secondary"
              fit="auto"
              className={styles.revert}
              onClick={team.onRevert}
              disabled={team.saving}
            >
              되돌리기
            </Button>
            <Button fit="auto" onClick={team.onSave} disabled={team.saving || team.emptyTeams.length > 0}>
              {team.saving ? '저장하는 중…' : '변경 저장'}
            </Button>
          </div>
        </div>
      )}
      {team.canEdit && team.emptyTeams.length > 0 && (
        <ErrorMessage>{`${emptyNames}에 선수가 없어요. 한 팀에 선수가 1명 이상 있어야 저장할 수 있어요.`}</ErrorMessage>
      )}
      <ErrorMessage>{failure?.message}</ErrorMessage>
      {team.outcome?.savedCount && !team.unsaved && (
        <p className={styles.saved} role="status">
          {`${team.outcome.savedCount}명을 옮겨 팀 구성을 저장했어요.`}
        </p>
      )}

      <div className={styles.editTeams}>
        {team.viewTeams.map((viewTeam) => (
          <TeamColumn
            key={viewTeam.teamId}
            team={viewTeam}
            otherTeams={team.lineup.teams.filter((other) => other.teamId !== viewTeam.teamId)}
            editable={team.canEdit}
            moveDisabled={team.saving}
            onMove={team.onMove}
            myGamePlayerId={team.myGamePlayerId}
            tactic={{ to: `/games/${game.id}/teams/${viewTeam.teamId}/tactic`, state: tacticState }}
            onLeave={team.confirmLeave}
          />
        ))}
      </div>

      {team.canEdit && (
        <TeamConfirm
          unsaved={team.unsaved}
          confirming={team.confirming}
          disabled={team.saving || !first || !second}
          error={team.confirmError}
          onConfirm={team.onConfirm}
        />
      )}
    </>
  )
}

// 확정된 팀(시안 DetailLineup): 실력 안내, 배치도 이미지 저장, 팀별 배치도와 선수 목록
function ConfirmedTeams({ game, team }) {
  return (
    <>
      <ConfirmedTools game={game} tactics={team.tactics} />
      <div className={styles.teams}>
        {team.lineup.teams.map((lineupTeam, index) => (
          <TeamCard
            key={lineupTeam.teamId}
            gameId={game.id}
            team={lineupTeam}
            tactic={team.tactics[index]}
            myGamePlayerId={team.myGamePlayerId}
          />
        ))}
      </div>
    </>
  )
}

// 실력 안내와 배치도 이미지 저장
function ConfirmedTools({ game, tactics }) {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const canSaveImage = tactics.length > 0 && tactics.every(Boolean)

  // 서버에 저장된 배치를 한 장의 PNG로 내려받는다(전술 배치도 화면과 같은 이미지)
  async function handleSaveImage() {
    if (pending.current || !canSaveImage) return
    pending.current = true
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const blob = await renderTacticImage(tacticImageLayout(tactics, `${game.title} 전술 배치도`))
      downloadBlob(blob, tacticImageFileName(game.id))
      setSaved(true)
    } catch (saveError) {
      if (saveError?.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      setError('이미지를 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <div className={styles.meta}>
      {/* 시안은 파티장 화면에도 이 안내를 둔다(파티장이 보는 실력이 다른 사람에게는 안 보인다는 뜻) */}
      <span className={styles.lockNote}>
        <LockIcon size={14} />
        <span>실력과 합계는 파티장에게만 보여요</span>
      </span>
      <div className={styles.metaAction}>
        <Button variant="secondary" fit="auto" onClick={handleSaveImage} disabled={saving || !canSaveImage}>
          <DownloadIcon size={18} />
          {saving ? '이미지 만드는 중…' : '배치도 이미지 저장'}
        </Button>
      </div>
      {!canSaveImage && (
        <p className={styles.metaNote}>배치를 불러오지 못한 팀이 있어 이미지로 저장할 수 없어요.</p>
      )}
      {saved && (
        <p className={styles.metaNote} role="status">
          이미지를 내려받았어요.
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  )
}

function TeamCard({ gameId, team, tactic, myGamePlayerId }) {
  const rows = teamRows(team)
  const markers = pitchMarkers(tactic)
  const titleId = `team-${team.teamId}`

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h2 id={titleId} className={styles.cardTitle}>
          {team.name}
        </h2>
        {tactic?.formation && <Badge tone="gray">{tactic.formation}</Badge>}
        {team.totalSkill !== null && team.totalSkill !== undefined && (
          <div className={styles.total}>
            <span className={styles.totalLabel}>실력 합계</span>
            <span className={styles.totalValue}>{team.totalSkill}</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        {tactic && (
          <div className={styles.pitch}>
            <LineupPitch label={`${team.name} 배치도`} markers={markers} />
          </div>
        )}
        <ul className={styles.rows}>
          {rows.map((row) => (
            <li key={row.id} className={styles.row}>
              <PositionChips positions={[row.position]} />
              <span className={styles.name}>{row.name}</span>
              {row.id === myGamePlayerId && <Badge tone="brand">나</Badge>}
              {row.isSubstitute && <Badge tone="gray">후보</Badge>}
              {row.skillLevel !== null && (
                <div className={styles.skillWrap}>
                  <span className={styles.skill}>{row.skillLevel}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Button
        as={Link}
        to={`/games/${gameId}/teams/${team.teamId}/tactic`}
        variant="secondary"
      >
        <PitchIcon size={18} />
        전술 배치도 열기
      </Button>
    </section>
  )
}

// 확정된 팀의 "경기 종료"(PATCH /games/{gameId}/finish, BE D-34). 되돌릴 수 없어 한 번 더 확인받는다.
// 시안은 이 자리에 "확정 취소"도 두지만 BE에 API가 없어 만들지 않는다(#119).
function FinishAction({ gameId, onFinished }) {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)

  async function handleFinish() {
    if (finishing) return
    setFinishing(true)
    setError(null)
    try {
      onFinished(await finishGame(gameId))
    } catch (finishError) {
      if (finishError?.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      setError(finishErrorMessage(finishError))
      setFinishing(false)
    }
  }

  if (!confirming) {
    return (
      <Button fit="auto" onClick={() => setConfirming(true)}>
        경기 종료
      </Button>
    )
  }

  return (
    <div className={styles.finishConfirm} role="group" aria-labelledby="finish-title">
      <p id="finish-title" className={styles.finishTitle}>
        경기를 종료할까요? 종료하면 되돌릴 수 없어요.
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className={styles.finishButtons}>
        <Button
          variant="secondary"
          fit="auto"
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          disabled={finishing}
          autoFocus
        >
          취소
        </Button>
        <Button fit="auto" onClick={handleFinish} disabled={finishing}>
          {finishing ? '종료하는 중…' : '경기 종료'}
        </Button>
      </div>
    </div>
  )
}
