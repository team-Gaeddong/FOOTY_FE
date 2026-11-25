import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { createMvpVote, getMvpVoteResult, getMyMvpVote } from '../api/mvpVotes.js'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { Avatar } from '../components/Avatar.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  LockIcon,
  PinIcon,
  TrophyIcon,
} from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { parseGameId } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import styles from './MvpVotePage.module.css'

const BLOCKED_MESSAGES = {
  MVP_403_1: ['참가한 경기만 투표할 수 있어요', '이 경기에 참가한 회원만 MVP 투표를 할 수 있어요.'],
  MVP_403_2: ['투표 후 결과를 확인할 수 있어요', 'MVP 투표를 마치면 현재 득표 결과를 볼 수 있어요.'],
  MVP_409_1: ['아직 투표할 수 없어요', '경기가 끝난 뒤 MVP를 투표할 수 있어요.'],
  MVP_409_2: ['이미 투표했어요', '한 경기에는 한 번만 투표할 수 있어요.'],
  GAME_404_1: ['경기를 찾을 수 없어요', '삭제됐거나 없는 경기예요.'],
}

// 결과 순위는 처음에 득표한 후보 중 몇 명만 보여 주고 "전체 보기"로 펼친다(시안 MvpResult).
const RANK_PREVIEW_COUNT = 6

function requestErrorMessage(error) {
  if (!(error instanceof ApiError)) return '정보를 불러오지 못했어요. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 이용할 수 있어요.'
  if (error.code === 'MVP_400_1') return '본인은 MVP로 선택할 수 없어요.'
  if (error.code === 'MVP_403_1') return '이 경기에 참가한 회원만 투표할 수 있어요.'
  if (error.code === 'MVP_409_1') return '경기가 끝난 뒤 MVP를 투표할 수 있어요.'
  if (error.code === 'MVP_409_2') return '이미 투표했어요. 화면을 새로고침해 주세요.'
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

// 시안 MvpVote·MvpResult의 틀. 투표 전·후로 제목이 바뀌어 모바일 하위 바를 화면이 직접 그린다.
function MvpFrame({ gameId, game, title, intro, narrow = false, children }) {
  const backPath = gameId === null ? '/' : `/games/${gameId}/after`
  return (
    <div className={styles.screen}>
      <header className={styles.subBar}>
        <Link className={styles.subBack} to={backPath} aria-label="뒤로">
          <ArrowLeftIcon size={22} />
        </Link>
        <p className={styles.subTitle}>{title}</p>
      </header>
      <main className={`${styles.page} ${narrow ? styles.narrow : ''}`}>
        <div className={styles.heading}>
          <Link className={styles.back} to={backPath}>
            <ArrowLeftIcon size={18} />
            {game?.title ?? '경기 후'}
          </Link>
          <div className={styles.titles}>
            {game && <p className={styles.eyebrow}>{`${game.title} · ${dateTimeLabel(game.playDate)}`}</p>}
            <h1 className={styles.title}>{title}</h1>
            {intro && <p className={styles.lead}>{intro}</p>}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

export function MvpVotePage() {
  const gameId = parseGameId(useParams().gameId)
  const [retry, setRetry] = useState(0)
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  const load = useCallback(async (active) => {
    if (gameId === null) {
      setData({ error: new ApiError(404, 'GAME_404_1', '') })
      return
    }

    try {
      const [game, playerResponse, profile, myVote] = await Promise.all([
        getGame(gameId),
        listGamePlayers(gameId),
        getMyProfile(),
        getMyMvpVote(gameId),
      ])
      const result = myVote.voted ? await getMvpVoteResult(gameId) : null
      if (active()) setData({ game, players: playerResponse.players, profile, myVote, result })
    } catch (loadError) {
      if (active()) setData({ error: loadError })
    }
  }, [gameId])

  useEffect(() => {
    let active = true
    setData(null)
    load(() => active)
    return () => {
      active = false
    }
  }, [load, retry])

  async function handleVote(event) {
    event.preventDefault()
    if (pending.current || selectedId === null) return
    pending.current = true
    setSubmitting(true)
    setError('')
    try {
      const myVote = await createMvpVote(gameId, selectedId)
      setData((current) => ({ ...current, myVote: { gameId, voted: true, gamePlayerId: myVote.gamePlayerId }, result: null }))
      try {
        const result = await getMvpVoteResult(gameId)
        setData((current) => ({ ...current, result }))
      } catch {
        setData((current) => ({ ...current, result: null }))
      }
    } catch (voteError) {
      if (voteError instanceof ApiError && voteError.code === 'GAME_404_1') {
        setData({ error: voteError })
      } else if (voteError instanceof ApiError && BLOCKED_MESSAGES[voteError.code]) {
        setData((current) => ({ ...current, blockedCode: voteError.code }))
      } else {
        setError(requestErrorMessage(voteError))
      }
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (!data) {
    return (
      <MvpFrame gameId={gameId} title="MVP 투표">
        <p className={styles.message} role="status">
          경기와 참가자를 불러오는 중…
        </p>
      </MvpFrame>
    )
  }

  if (data.error) {
    const blocked = BLOCKED_MESSAGES[data.error.code]
    return (
      <MvpFrame gameId={gameId} title="MVP 투표">
        <StateCard
          role="alert"
          tone={blocked ? 'neutral' : 'danger'}
          icon={blocked ? <PinIcon size={22} /> : <AlertTriangleIcon size={22} />}
          title={blocked ? blocked[0] : '화면을 불러오지 못했어요'}
          actions={
            <Button variant="secondary" fit="auto" onClick={() => setRetry((count) => count + 1)}>
              다시 시도
            </Button>
          }
        >
          {blocked ? blocked[1] : requestErrorMessage(data.error)}
        </StateCard>
      </MvpFrame>
    )
  }

  const { game, players, profile, myVote, result, blockedCode } = data
  const blocked = BLOCKED_MESSAGES[blockedCode]
  const ownPlayer = players.find((player) => player.memberId === profile.memberId)
  const myCandidate = players.find((player) => player.id === myVote.gamePlayerId)
  const selected = players.find((player) => player.id === selectedId)
  const backTo = `/games/${gameId}/after`

  let body
  if (blocked) {
    body = (
      <StateCard
        role="status"
        icon={<LockIcon size={22} />}
        title={blocked[0]}
        actions={
          <Button as={Link} to={backTo} variant="secondary" fit="auto">
            경기 후 탭으로
          </Button>
        }
      >
        {blocked[1]}
      </StateCard>
    )
  } else if (game.status !== 'FINISHED') {
    body = (
      <StateCard role="status" icon={<ClockIcon size={22} />} title="경기가 끝난 뒤 투표할 수 있어요">
        경기 종료 후 참가 선수 중 MVP를 한 명 선택할 수 있어요.
      </StateCard>
    )
  } else if (!game.isJoined) {
    body = (
      <StateCard role="status" icon={<LockIcon size={22} />} title="참가한 회원만 투표할 수 있어요">
        이 경기에 참가한 회원에게 투표 권한이 있어요.
      </StateCard>
    )
  } else if (myVote.voted) {
    body = <Results result={result} myCandidate={myCandidate} players={players} ownPlayer={ownPlayer} />
  } else {
    body = (
      <form className={styles.form} onSubmit={handleVote}>
        <p className={styles.info}>
          <InfoIcon size={18} />
          <span>한 사람이 한 표만 던질 수 있고, 투표한 뒤에는 바꿀 수 없어요. 누가 누구를 골랐는지는 공개되지 않아요.</span>
        </p>
        <fieldset className={styles.fieldset} disabled={submitting}>
          <legend className={styles.srOnly}>MVP 후보 선수</legend>
          {!players.some((player) => player.id !== ownPlayer?.id) ? (
            <p className={styles.message}>투표할 수 있는 선수가 없어요.</p>
          ) : (
            <div className={styles.candidates}>
              {players.map((player) => {
                const own = player.id === ownPlayer?.id
                const checked = selectedId === player.id
                return (
                  <label
                    key={player.id}
                    className={[styles.candidate, checked && styles.selected, own && styles.own].filter(Boolean).join(' ')}
                  >
                    <input
                      type="radio"
                      name="mvp-candidate"
                      value={player.id}
                      checked={checked}
                      disabled={own}
                      onChange={() => {
                        setSelectedId(player.id)
                        setError('')
                      }}
                    />
                    <Avatar name={player.name} tone={own ? 'brand' : 'neutral'} />
                    <span className={styles.candidateText}>
                      <span className={styles.candidateName}>{player.name}</span>
                      {player.positions?.[0] && (
                        <span className={styles.chips}>
                          <span className={styles.chip}>{player.positions[0]}</span>
                        </span>
                      )}
                    </span>
                    {own ? (
                      <span className={styles.ownLabel}>본인</span>
                    ) : (
                      <span className={styles.mark} aria-hidden="true">
                        {checked && <CheckIcon size={14} strokeWidth={2.5} />}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>
        <ErrorMessage>{error}</ErrorMessage>
        <div className={styles.actions}>
          <span className={styles.actionLabel}>
            {selected ? `${selected.name}에게 투표` : '선수를 한 명 선택해 주세요'}
          </span>
          <Button type="submit" size="lg" fit="responsive" disabled={selectedId === null || submitting}>
            {submitting ? '투표하는 중…' : selected ? <MobileVoteLabel name={selected.name} /> : '투표하기'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <MvpFrame
      gameId={gameId}
      game={game}
      narrow={myVote.voted && !blocked}
      title={myVote.voted ? 'MVP 결과' : 'MVP 투표'}
      intro={myVote.voted ? '투표를 마친 사람에게만 보이는 현재 집계예요.' : '오늘 가장 빛난 선수 한 명을 골라 주세요.'}
    >
      {body}
    </MvpFrame>
  )
}

// 모바일 제출 버튼은 "OO에게 투표하기", PC는 옆에 "OO에게 투표" 안내가 있어 "투표하기"만 쓴다(시안).
function MobileVoteLabel({ name }) {
  return (
    <>
      <span className={styles.mobileOnly}>{`${name}에게 투표하기`}</span>
      <span className={styles.pcOnly}>투표하기</span>
    </>
  )
}

function Results({ result, myCandidate, players, ownPlayer }) {
  const [showAll, setShowAll] = useState(false)
  if (!result) {
    return (
      <StateCard role="status" icon={<CheckIcon size={22} />} title="투표는 저장됐어요">
        결과를 불러오지 못했어요. 경기 후 탭에서 다시 열어 주세요.
      </StateCard>
    )
  }

  const highestVote = Math.max(0, ...result.candidates.map((candidate) => candidate.voteCount))
  const winners = result.candidates.filter((candidate) => result.mvpGamePlayerIds.includes(candidate.gamePlayerId))
  const topCandidate = winners[0]
  const votedCandidates = result.candidates.filter((candidate) => candidate.voteCount > 0)
  const visibleCandidates = showAll ? result.candidates : votedCandidates.slice(0, RANK_PREVIEW_COUNT)
  const zeroCount = result.candidates.length - votedCandidates.length
  const remainingVotes = Math.max(0, result.requiredCount - result.votedCount)
  // 막대 길이는 시안처럼 정수 %로 반올림한다
  const voteProgress = result.requiredCount > 0 ? Math.min(100, Math.round((result.votedCount / result.requiredCount) * 100)) : 0
  const positionOf = (gamePlayerId) => players.find((player) => player.id === gamePlayerId)?.positions?.[0]

  return (
    <>
      {topCandidate && (
        <section className={styles.winner} aria-labelledby="mvp-winner">
          <div className={styles.winnerMain}>
            <span className={styles.trophy} aria-hidden="true">
              <TrophyIcon size={34} />
            </span>
            <div className={styles.winnerText}>
              <p className={styles.winnerLabel}>현재 {winners.length > 1 ? '공동 MVP' : 'MVP'}</p>
              <h2 id="mvp-winner" className={styles.winnerName}>
                {topCandidate.name}
                {winners.length > 1 ? ` 외 ${winners.length - 1}명` : ''}
              </h2>
              <p className={styles.winnerMeta}>
                {[positionOf(topCandidate.gamePlayerId), `${topCandidate.voteCount}표`].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <span>투표 현황</span>
              <strong>{`${result.votedCount} / ${result.requiredCount}명`}</strong>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={result.requiredCount}
              aria-valuenow={result.votedCount}
              aria-label="투표 현황"
            >
              <span style={{ width: `${voteProgress}%` }} />
            </div>
            {myCandidate && (
              <div className={styles.progressRow}>
                <span>내 투표</span>
                <span className={styles.myVote}>
                  <CheckIcon size={12} />
                  {myCandidate.name}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.rank} aria-labelledby="mvp-rank">
        <div className={styles.rankHeader}>
          <h2 id="mvp-rank">득표 순위</h2>
          <span>득표 많은 순 · 같으면 참여 순</span>
        </div>
        <ol className={styles.rankList}>
          {visibleCandidates.map((candidate, index) => {
            const winner = highestVote > 0 && result.mvpGamePlayerIds.includes(candidate.gamePlayerId)
            const isMe = candidate.gamePlayerId === ownPlayer?.id
            return (
              <li key={candidate.gamePlayerId} className={styles.rankItem}>
                <span className={styles.rankNumber}>{index + 1}</span>
                <Avatar name={candidate.name} tone={isMe ? 'brand' : 'neutral'} />
                <div className={styles.rankBody}>
                  <div className={styles.rankName}>
                    <span>{candidate.name}</span>
                    {winner && <span className={styles.badge}>MVP</span>}
                    {isMe && <span className={styles.badge}>나</span>}
                  </div>
                  <div className={styles.rankBar} aria-hidden="true">
                    <span
                      className={winner ? styles.winnerBar : ''}
                      style={{ width: `${highestVote > 0 ? Math.round((candidate.voteCount / highestVote) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <span className={styles.rankCount}>{candidate.voteCount}표</span>
              </li>
            )
          })}
        </ol>
        <div className={styles.rankFooter}>
          <p>{zeroCount > 0 ? `나머지 ${zeroCount}명은 아직 표가 없어요.` : '모든 후보의 득표를 표시했어요.'}</p>
          {result.candidates.length > Math.min(votedCandidates.length, RANK_PREVIEW_COUNT) && (
            <Button variant="secondary" fit="auto" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
              {showAll ? '접기' : '전체 보기'}
            </Button>
          )}
        </div>
      </section>

      <p className={styles.info}>
        <InfoIcon size={18} />
        <span>
          {remainingVotes > 0
            ? `아직 ${remainingVotes}명이 투표하지 않았어요. 모두 마치기 전에는 순위가 바뀔 수 있고, 동점이면 공동 MVP가 돼요.`
            : '투표가 모두 끝났어요. 동점이면 공동 MVP가 돼요.'}
        </span>
      </p>
    </>
  )
}
