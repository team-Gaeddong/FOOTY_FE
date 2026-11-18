import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { createMvpVote, getMvpVoteResult, getMyMvpVote } from '../api/mvpVotes.js'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { Button } from '../components/Button.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
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
      <PageLayout>
        <Link className={styles.backLink} to={gameId ? `/games/${gameId}` : '/games'}>← 경기 상세</Link>
        <section className={styles.messageCard} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>경기와 참가자를 불러오는 중…</p>
        </section>
      </PageLayout>
    )
  }

  if (data.error) {
    const [title, description] = BLOCKED_MESSAGES[data.error.code] ?? ['화면을 불러오지 못했어요', requestErrorMessage(data.error)]
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.messageCard} role="alert">
          <h1>{title}</h1>
          <p>{description}</p>
          <Button variant="secondary" onClick={() => setRetry((count) => count + 1)}>다시 시도</Button>
        </section>
      </PageLayout>
    )
  }

  const { game, players, profile, myVote, result, blockedCode } = data
  const blocked = BLOCKED_MESSAGES[blockedCode]
  const candidates = players.filter((player) => player.memberId !== profile.memberId)
  const myCandidate = players.find((player) => player.id === myVote.gamePlayerId)

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{game.title}</p>
        <h1>오늘의 MVP 투표</h1>
        <p className={styles.intro}>오늘 경기에서 가장 활약한 선수를 선택해 주세요.</p>
      </header>

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
        <Results result={result} myCandidate={myCandidate} />
      ) : (
        <form className={styles.form} onSubmit={handleVote}>
          <fieldset className={styles.fieldset} disabled={submitting}>
            <legend>후보 선수 <span>한 명 선택</span></legend>
            {candidates.length === 0 ? (
              <p className={styles.empty}>투표할 수 있는 선수가 없어요.</p>
            ) : (
              <div className={styles.candidates}>
                {candidates.map((player) => (
                  <label key={player.id} className={`${styles.candidate} ${selectedId === player.id ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="mvp-candidate"
                      value={player.id}
                      checked={selectedId === player.id}
                      onChange={() => {
                        setSelectedId(player.id)
                        setError('')
                      }}
                    />
                    <span className={styles.avatar} aria-hidden="true">{player.name.slice(0, 1)}</span>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.radioMark} aria-hidden="true" />
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <p className={styles.voteNote}>한 번 제출하면 투표를 바꿀 수 없어요.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button type="submit" disabled={selectedId === null || submitting || candidates.length === 0}>
            {submitting ? '투표하는 중…' : 'MVP 투표하기'}
          </Button>
        </form>
      )}
    </PageLayout>
  )
}

function Results({ result, myCandidate }) {
  if (!result) {
    return (
      <section className={styles.messageCard} role="status">
        <h2>투표는 저장됐어요</h2>
        <p>결과를 불러오지 못했어요. 경기 상세에서 다시 열어 주세요.</p>
      </section>
    )
  }

  const highestVote = Math.max(0, ...result.candidates.map((candidate) => candidate.voteCount))
  return (
    <section className={styles.results} aria-labelledby="result-title">
      <div className={styles.resultHeader}>
        <div>
          <p className={styles.eyebrow}>투표 완료</p>
          <h2 id="result-title">MVP 투표 결과</h2>
        </div>
        <strong className={styles.voteCount}>{result.votedCount}<span> / {result.requiredCount}명</span></strong>
      </div>
      {myCandidate && <p className={styles.myVote}>내가 선택한 선수 <strong>{myCandidate.name}</strong></p>}
      <ol className={styles.resultList}>
        {result.candidates.map((candidate) => {
          const winner = highestVote > 0 && candidate.voteCount === highestVote
          return (
            <li key={candidate.gamePlayerId} className={`${styles.resultItem} ${winner ? styles.winner : ''}`}>
              <span className={styles.resultRank} aria-label={winner ? '최다 득표' : undefined}>
                {winner ? 'MVP' : ''}
              </span>
              <span className={styles.resultName}>{candidate.name}</span>
              <strong>{candidate.voteCount}<span>표</span></strong>
            </li>
          )
        })}
      </ol>
      <p className={styles.resultNote}>동점이면 공동 MVP로 표시돼요.</p>
    </section>
  )
}
