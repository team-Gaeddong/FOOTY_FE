import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { createMvpVote, getMvpVoteResult, getMyMvpVote } from '../api/mvpVotes.js'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { POSITION_LABELS } from '../components/positions.js'
import { formatPlayDate, parseGameId } from './gameDetail.js'
import styles from './MvpVotePage.module.css'

const BLOCKED_MESSAGES = {
  MVP_403_1: ['참가한 경기만 투표할 수 있어요', '이 경기에 참가한 회원만 MVP 투표를 할 수 있어요.'],
  MVP_403_2: ['투표 후 결과를 확인할 수 있어요', 'MVP 투표를 마치면 현재 득표 결과를 볼 수 있어요.'],
  MVP_409_1: ['아직 투표할 수 없어요', '경기가 끝난 뒤 MVP를 투표할 수 있어요.'],
  MVP_409_2: ['이미 투표했어요', '한 경기에는 한 번만 투표할 수 있어요.'],
  GAME_404_1: ['경기를 찾을 수 없어요', '삭제되었거나 없는 경기예요.'],
}

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

function MvpFrame({ gameId, game, profile, title, intro, children }) {
  const backPath = gameId ? `/games/${gameId}` : '/games'
  return (
    <div className={styles.screen}>
      <header className={styles.desktopNav}>
        <div className={styles.navInner}>
          <Link className={styles.logo} to="/games">FOOTY</Link>
          <nav className={styles.navLinks} aria-label="주 메뉴"><Link to="/games">경기</Link><Link to="/games/mine">내 경기</Link></nav>
          <div className={styles.navActions}>
            <Link className={styles.createLink} to="/games/new">＋ 경기 만들기</Link>
            <Link className={styles.profileLink} to="/profile"><span>{profile?.nickname?.slice(0, 1) ?? '나'}</span>{profile?.nickname ?? '내 프로필'}</Link>
          </div>
        </div>
      </header>
      <header className={styles.mobileNav}><Link to={backPath} aria-label="뒤로 가기">←</Link><strong>{title}</strong></header>
      <main className={styles.main}>
        <Link className={styles.backLink} to={backPath}>← {game?.title ?? '경기 상세'}</Link>
        <div className={styles.pageHeading}>
          {game && <p className={styles.gameLine}>{game.title} · {formatPlayDate(game.playDate)}</p>}
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
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
        <section className={styles.messageCard} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>경기와 참가자를 불러오는 중…</p>
        </section>
      </MvpFrame>
    )
  }

  if (data.error) {
    const [title, description] = BLOCKED_MESSAGES[data.error.code] ?? ['화면을 불러오지 못했어요', requestErrorMessage(data.error)]
    return (
      <MvpFrame gameId={gameId} title="MVP 투표">
        <section className={styles.messageCard} role="alert">
          <h2>{title}</h2>
          <p>{description}</p>
          <button className={styles.secondaryButton} type="button" onClick={() => setRetry((count) => count + 1)}>다시 시도</button>
        </section>
      </MvpFrame>
    )
  }

  const { game, players, profile, myVote, result, blockedCode } = data
  const blocked = BLOCKED_MESSAGES[blockedCode]
  const ownPlayer = players.find((player) => player.memberId === profile.memberId)
  const myCandidate = players.find((player) => player.id === myVote.gamePlayerId)

  return (
    <MvpFrame gameId={gameId} game={game} profile={profile} title={myVote.voted ? 'MVP 결과' : 'MVP 투표'} intro={myVote.voted ? '투표를 마친 사람에게만 보이는 현재 집계예요.' : '오늘 가장 빛난 선수 한 명을 골라 주세요.'}>

      {blocked ? (
        <section className={styles.messageCard} role="status">
          <h2>{blocked[0]}</h2>
          <p>{blocked[1]}</p>
          <Link className={styles.secondaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
        </section>
      ) : game.status !== 'FINISHED' ? (
        <section className={styles.messageCard} role="status">
          <h2>경기가 끝난 뒤 투표할 수 있어요</h2>
          <p>경기 종료 후 참가 선수 중 MVP를 한 명 선택할 수 있어요.</p>
        </section>
      ) : !game.isJoined ? (
        <section className={styles.messageCard} role="status">
          <h2>참가한 회원만 투표할 수 있어요</h2>
          <p>이 경기에 참가한 회원에게 투표 권한이 있어요.</p>
        </section>
      ) : myVote.voted ? (
        <Results result={result} myCandidate={myCandidate} players={players} ownPlayer={ownPlayer} />
      ) : (
        <form className={styles.form} onSubmit={handleVote}>
          <p className={styles.infoBar}><span aria-hidden="true">ⓘ</span>한 사람이 한 표만 던질 수 있고, 투표한 뒤에는 바꿀 수 없어요. 누가 누구를 골랐는지는 공개되지 않아요.</p>
          <fieldset className={styles.fieldset} disabled={submitting}>
            <legend className={styles.srOnly}>MVP 후보 선수</legend>
            {!players.some((player) => player.id !== ownPlayer?.id) ? (
              <p className={styles.empty}>투표할 수 있는 선수가 없어요.</p>
            ) : (
              <div className={styles.candidates}>
                {players.map((player) => (
                  <label key={player.id} className={`${styles.candidate} ${selectedId === player.id ? styles.selected : ''} ${player.id === ownPlayer?.id ? styles.ownCandidate : ''}`}>
                    <input
                      type="radio"
                      name="mvp-candidate"
                      value={player.id}
                      checked={selectedId === player.id}
                      disabled={player.id === ownPlayer?.id}
                      onChange={() => {
                        setSelectedId(player.id)
                        setError('')
                      }}
                    />
                    <span className={`${styles.avatar} ${player.id === ownPlayer?.id ? styles.ownAvatar : ''}`} aria-hidden="true">{player.name.slice(0, 1)}</span>
                    <span className={styles.playerInfo}><strong>{player.name}</strong><small>{POSITION_LABELS[player.positions?.[0]] ?? '선수'}</small></span>
                    {player.id === ownPlayer?.id ? <span className={styles.ownLabel}>본인</span> : <span className={styles.radioMark} aria-hidden="true">{selectedId === player.id ? '✓' : ''}</span>}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.voteFooter}>
            <span>{selectedId === null ? '선수를 한 명 선택해 주세요' : `${players.find((player) => player.id === selectedId)?.name ?? '선수'}에게 투표`}</span>
            <button className={styles.primaryButton} type="submit" disabled={selectedId === null || submitting}>{submitting ? '투표하는 중…' : '투표하기'}</button>
          </div>
        </form>
      )}
    </MvpFrame>
  )
}

function Results({ result, myCandidate, players, ownPlayer }) {
  const [showAll, setShowAll] = useState(false)
  if (!result) {
    return (
      <section className={styles.messageCard} role="status">
        <h2>투표는 저장됐어요</h2>
        <p>결과를 불러오지 못했어요. 경기 상세에서 다시 열어 주세요.</p>
      </section>
    )
  }

  const highestVote = Math.max(0, ...result.candidates.map((candidate) => candidate.voteCount))
  const winners = result.candidates.filter((candidate) => result.mvpGamePlayerIds.includes(candidate.gamePlayerId))
  const topCandidate = winners[0]
  const votedCandidates = result.candidates.filter((candidate) => candidate.voteCount > 0)
  const visibleCandidates = showAll ? result.candidates : votedCandidates.slice(0, 6)
  const zeroCount = result.candidates.length - votedCandidates.length
  const remainingVotes = Math.max(0, result.requiredCount - result.votedCount)
  const voteProgress = result.requiredCount > 0 ? Math.min(100, result.votedCount / result.requiredCount * 100) : 0
  return (
    <section className={styles.results} aria-labelledby="result-title">
      <h2 id="result-title" className={styles.srOnly}>MVP 결과 상세</h2>
      {topCandidate && (
        <div className={styles.winnerCard}>
          <span className={styles.trophy} aria-hidden="true">🏆</span>
          <div className={styles.winnerDetails}>
            <p>현재 {winners.length > 1 ? '공동 MVP' : 'MVP'}</p>
            <h3>{topCandidate.name}{winners.length > 1 ? ` 외 ${winners.length - 1}명` : ''}</h3>
            <span>{POSITION_LABELS[players.find((player) => player.id === topCandidate.gamePlayerId)?.positions?.[0]] ?? '선수'} · {topCandidate.voteCount}표</span>
          </div>
          <div className={styles.votingProgress}>
            <p><span>투표 현황</span><strong>{result.votedCount} / {result.requiredCount}명</strong></p>
            <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={result.requiredCount} aria-valuenow={result.votedCount} aria-label="투표 현황"><span style={{ width: `${voteProgress}%` }} /></div>
            {myCandidate && <p className={styles.myVote}>내 투표 <strong>✓ {myCandidate.name}</strong></p>}
          </div>
        </div>
      )}
      <div className={styles.rankCard}>
        <div className={styles.rankHeading}><h3>득표 순위</h3><span>득표 많은 순 · 같으면 참여 순</span></div>
        <ol className={styles.resultList}>
          {visibleCandidates.map((candidate, index) => {
            const winner = highestVote > 0 && result.mvpGamePlayerIds.includes(candidate.gamePlayerId)
            const isMe = candidate.gamePlayerId === ownPlayer?.id
            return (
              <li key={candidate.gamePlayerId} className={styles.resultItem}>
                <span className={styles.resultRank}>{index + 1}</span>
                <span className={`${styles.resultAvatar} ${isMe ? styles.ownAvatar : ''}`} aria-hidden="true">{candidate.name.slice(0, 1)}</span>
                <div className={styles.resultInfo}>
                  <div><strong>{candidate.name}</strong>{winner && <span className={styles.mvpBadge}>MVP</span>}{isMe && <span className={styles.meBadge}>나</span>}</div>
                  <div className={styles.rankTrack}><span className={winner ? styles.winnerBar : ''} style={{ width: `${highestVote > 0 ? candidate.voteCount / highestVote * 100 : 0}%` }} /></div>
                </div>
                <strong className={styles.resultCount}>{candidate.voteCount}표</strong>
              </li>
            )
          })}
        </ol>
        <div className={styles.rankFooter}>
          <span>{zeroCount > 0 ? `나머지 ${zeroCount}명은 아직 표가 없어요.` : '모든 후보의 득표를 표시했어요.'}</span>
          {result.candidates.length > visibleCandidates.length && <button className={styles.secondaryButton} type="button" onClick={() => setShowAll(true)}>전체 보기</button>}
          {showAll && result.candidates.length > 6 && <button className={styles.secondaryButton} type="button" onClick={() => setShowAll(false)}>접기</button>}
        </div>
      </div>
      <p className={styles.resultNote}><span aria-hidden="true">ⓘ</span>{remainingVotes > 0 ? `아직 ${remainingVotes}명이 투표하지 않았어요. 모두 마치기 전에는 순위가 바뀔 수 있고, 동점이면 공동 MVP가 돼요.` : '투표가 모두 끝났어요. 동점이면 공동 MVP가 돼요.'}</p>
    </section>
  )
}
