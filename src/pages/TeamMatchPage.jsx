import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { createLineup } from '../api/lineups.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { POSITION_LABELS } from '../components/positions.js'
import styles from './TeamMatchPage.module.css'

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '팀을 짜지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GAME_403_1') return '파티장만 팀을 짤 수 있어요.'
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요. 목록에서 다시 확인해 주세요.'
  if (error.code === 'LINEUP_409_1') return '이미 팀을 짠 경기예요.'
  if (error.code === 'LINEUP_409_2') return '실력 점수가 없는 선수가 있어요. 모든 선수의 실력을 매긴 뒤 다시 시도해 주세요.'
  if (error.code === 'LINEUP_409_3') return '팀을 짜려면 참가 선수가 2명 이상이어야 해요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 팀을 짤 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '팀을 짜지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function TeamMatchPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const numericId = Number(gameId)
  const validId = /^\d+$/.test(gameId ?? '') && Number.isSafeInteger(numericId) && numericId > 0
  const game = location.state?.game?.id === numericId ? location.state.game : null
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lineup, setLineup] = useState(null)
  const pending = useRef(false)

  async function handleCreate() {
    if (pending.current || !validId) return

    pending.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      setLineup(await createLineup(numericId))
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      pending.current = false
      setSubmitting(false)
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
    // 라인업 조회 API가 없어 팀 목록은 전술 배치도 화면에 이동 state로 넘긴다
    const tacticState = {
      gameId: numericId,
      gameTitle: game?.title ?? null,
      hostId: game?.hostId ?? null,
      teams: lineup.teams.map(({ teamId, name }) => ({ teamId, name })),
    }
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>팀 짜기 완료</p>
          <h1>{game?.title ?? `경기 #${numericId}`}</h1>
          <p>실력이 비슷하도록 두 팀에 번갈아 배정했어요.</p>
        </header>
        <ul className={styles.teams}>
          {lineup.teams.map((team) => (
            <li key={team.teamId}>
              <TeamCard team={team} tacticState={tacticState} gameId={numericId} />
            </li>
          ))}
        </ul>
        <p className={styles.note}>후보 선수는 팀 실력 합계에서 빠져요.</p>
        <Link className={styles.primaryLink} to="/games">경기 목록으로 돌아가기</Link>
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
        <ErrorMessage>{submitError}</ErrorMessage>
        <Button onClick={handleCreate} disabled={submitting}>
          {submitting ? '팀 짜는 중…' : '팀 짜기'}
        </Button>
      </section>
    </PageLayout>
  )
}

function TeamCard({ team, gameId, tacticState }) {
  return (
    <article className={styles.teamCard} aria-labelledby={`team-${team.teamId}`}>
      <div className={styles.teamHeader}>
        <h2 id={`team-${team.teamId}`}>{team.name}</h2>
        <span className={styles.totalSkill}>실력 합계 {team.totalSkill ?? '-'}</span>
      </div>
      {team.members.length === 0 ? (
        <p className={styles.empty}>배정된 선수가 없어요.</p>
      ) : (
        <ul className={styles.members}>
          {team.members.map((member) => (
            <li key={member.gamePlayerId} className={member.isSubstitute ? styles.substitute : ''}>
              <span className={styles.position}>{member.position}</span>
              <span className={styles.memberName}>
                {member.name}
                <span className={styles.positionLabel}>{POSITION_LABELS[member.position] ?? member.position}</span>
              </span>
              {member.isSubstitute && <span className={styles.subBadge}>후보</span>}
              <span className={styles.skill}>{member.skillLevel}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        className={styles.tacticLink}
        to={`/games/${gameId}/teams/${team.teamId}/tactic`}
        state={tacticState}
      >
        전술 배치도 짜기 →
      </Link>
    </article>
  )
}
