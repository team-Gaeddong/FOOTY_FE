import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router'
import { finishGame, listGamePlayers } from '../api/games.js'
import { getLatestLineup } from '../api/lineups.js'
import { getMyProfile } from '../api/member.js'
import { getTactic } from '../api/tactics.js'
import { useAuth } from '../auth/useAuth.js'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { DownloadIcon, LockIcon, PitchIcon, SwapIcon } from '../components/Icons.jsx'
import { LineupPitch } from '../components/LineupPitch.jsx'
import { PositionChips } from '../components/PositionChips.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { downloadBlob, renderTacticImage, tacticImageFileName, tacticImageLayout } from '../components/tacticImage.js'
import { GameHeader } from './GameHeader.jsx'
import {
  bannerKind,
  finishErrorMessage,
  isNoLineup,
  lineupErrorMessage,
  lineupNote,
  methodLabel,
  pitchMarkers,
  teamRows,
} from './lineupView.js'
import styles from './GameLineupPage.module.css'

// 라인업과 팀별 배치(전술)를 함께 받는다. 배치를 못 받은 팀은 null이라 배치도 없이 선수 목록만 보여 준다.
function useLineup(gameId) {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, lineup, tactics } | { key, error }
  const requestKey = `${gameId}:${retryCount}`

  useEffect(() => {
    let active = true
    getLatestLineup(gameId)
      .then(async (lineup) => {
        const tactics = await Promise.all(
          lineup.teams.map((team) => getTactic(gameId, team.teamId).catch(() => null)),
        )
        if (active) setResult({ key: requestKey, lineup, tactics })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, requestKey])

  return {
    loaded: result?.key === requestKey ? result : null,
    retry: () => setRetryCount((count) => count + 1),
  }
}

// 라인업의 "나" 표시를 위해 내 경기 선수 ID를 찾는다. 못 찾아도 화면은 그대로 동작한다.
function useMyGamePlayerId(gameId) {
  const [id, setId] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([getMyProfile(), listGamePlayers(gameId)])
      .then(([profile, data]) => {
        const me = data.players.find((player) => player.memberId === profile.memberId)
        if (active) setId(me?.id ?? null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [gameId])

  return id
}

// 경기 상세의 라인업 탭(읽기). 팀을 짜고 고치는 화면은 /games/:gameId/lineup/edit이다.
export function GameLineupPage() {
  const { game, onUpdated } = useOutletContext()
  const { loaded, retry } = useLineup(game.id)
  const myGamePlayerId = useMyGamePlayerId(game.id)
  const [finished, setFinished] = useState(false)
  const lineup = loaded?.lineup
  const banner = lineup ? bannerKind({ isHost: game.isHost, status: game.status }) : null

  let content
  if (!loaded) {
    content = (
      <p className={styles.message} role="status">
        라인업을 불러오는 중…
      </p>
    )
  } else if (loaded.error) {
    content = isNoLineup(loaded.error) ? (
      <StateCard
        icon={<SwapIcon size={22} />}
        title="아직 팀을 짜지 않았어요"
        actions={
          <>
            {game.isHost && game.status === 'RECRUITING' && (
              <Button as={Link} to={`/games/${game.id}/lineup/edit`} fit="auto">
                팀 짜기
              </Button>
            )}
            <span className={styles.code}>LINEUP_404_2</span>
          </>
        }
      >
        파티장이 실력을 모두 입력하고 팀을 짜면 여기에 보여요.
      </StateCard>
    ) : (
      <div className={styles.message}>
        <ErrorMessage>{lineupErrorMessage(loaded.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={retry}>
          다시 시도
        </Button>
      </div>
    )
  } else {
    content = (
      <div className={styles.content}>
        {finished && (
          <p className={styles.notice} role="status">
            경기를 종료했어요. 이제 밸런스 평가와 MVP 투표를 열 수 있어요.
          </p>
        )}
        {banner === 'finish' && (
          <FinishBanner
            gameId={game.id}
            onFinished={(updated) => {
              setFinished(true)
              onUpdated(updated)
            }}
          />
        )}
        {banner === 'edit' && (
          <div className={styles.banner}>
            <div className={styles.bannerText}>
              <p className={styles.bannerTitle}>팀이 아직 확정되지 않았어요</p>
              <p className={styles.bannerDescription}>
                팀 짜기 화면에서 팀을 고치거나 확정할 수 있어요.
              </p>
            </div>
            <Button as={Link} to={`/games/${game.id}/lineup/edit`} fit="auto">
              팀 짜기 화면 열기
            </Button>
          </div>
        )}
        <LineupMeta game={game} lineup={lineup} tactics={loaded.tactics} />
        <div className={styles.teams}>
          {lineup.teams.map((team, index) => (
            <TeamCard
              key={team.teamId}
              gameId={game.id}
              team={team}
              tactic={loaded.tactics[index]}
              myGamePlayerId={myGamePlayerId}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <GameHeader game={game} current="lineup" countNote={lineup ? lineupNote(lineup) : undefined} />
      {content}
    </>
  )
}

// 편성 방식·버전·확정 여부 칩, (파티장이 아니면) 실력 안내, 배치도 이미지 저장
function LineupMeta({ game, lineup, tactics }) {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const canSaveImage = tactics.every(Boolean)
  const method = methodLabel(lineup.method)

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
      {method && <Badge tone="gray">{method}</Badge>}
      <Badge tone="gray">버전 {lineup.version}</Badge>
      <Badge tone={lineup.isConfirmed ? 'navy' : 'gray'}>{lineup.isConfirmed ? '확정' : '미확정'}</Badge>
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

// 팀이 확정된 경기의 파티장이 경기를 종료한다(PATCH /games/{gameId}/finish, BE D-34). 되돌릴 수 없어 한 번 더 확인받는다.
function FinishBanner({ gameId, onFinished }) {
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
      <div className={styles.banner}>
        <div className={styles.bannerText}>
          <p className={styles.bannerTitle}>팀이 확정됐어요</p>
          <p className={styles.bannerDescription}>
            경기를 마치면 종료를 눌러 주세요. 종료는 되돌릴 수 없고, 밸런스 평가와 MVP 투표가 열려요.
          </p>
        </div>
        <Button fit="auto" onClick={() => setConfirming(true)}>
          경기 종료
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.banner} role="group" aria-labelledby="finish-title">
      <div className={styles.bannerText}>
        <p id="finish-title" className={styles.bannerTitle}>
          경기를 종료할까요?
        </p>
        <p className={styles.bannerDescription}>종료하면 되돌릴 수 없어요.</p>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      <div className={styles.bannerButtons}>
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
