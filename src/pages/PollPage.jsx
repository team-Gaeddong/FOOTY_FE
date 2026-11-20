import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { answerPoll, getPoll, listPolls } from '../api/polls.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
import {
  deadlineText,
  parsePollId,
  pollErrorMessage,
  sameSelection,
  selectedOptionIds,
  toggleSelection,
} from './polls.js'
import styles from './PollPage.module.css'

const LOAD_FAILED = '투표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

function InvalidAddress({ gameId }) {
  const to = gameId === null ? '/games' : `/games/${gameId}/polls`
  return (
    <section className={styles.panel}>
      <h1>투표 주소를 확인해 주세요</h1>
      <p>경기 상세에서 다시 열어 주세요.</p>
      <Link className={styles.secondaryLink} to={to}>
        {gameId === null ? '경기 목록으로' : '투표 목록으로'}
      </Link>
    </section>
  )
}

function LoadFailure({ error, onRetry, backTo }) {
  return (
    <section className={styles.panel}>
      <ErrorMessage>{pollErrorMessage(error, LOAD_FAILED)}</ErrorMessage>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onRetry}>다시 시도</Button>
        <Link className={styles.secondaryLink} to={backTo}>돌아가기</Link>
      </div>
    </section>
  )
}

function PollBadges({ poll }) {
  return (
    <div className={styles.badges}>
      <span className={poll.isClosed ? styles.closedBadge : styles.badge}>{poll.isClosed ? '마감' : '진행 중'}</span>
      <span className={styles.badge}>{poll.allowMultiple ? '복수 선택' : '하나만 선택'}</span>
      {poll.hasVoted && <span className={styles.votedBadge}>참여함</span>}
    </div>
  )
}

// 의견 투표 목록(GET /games/{gameId}/polls, BE D-34). 파티장과 경기 참가 회원만 본다.
// 파티장 여부는 경기 상세가 넘겨준 state로만 알 수 있어 "투표 만들기" 노출에만 쓰고, 권한은 BE가 판단한다.
export function PollListPage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const gameTitle = location.state?.gameTitle
  const isHost = location.state?.isHost === true
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${gameId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (gameId === null) return
    let active = true
    listPolls(gameId)
      .then((data) => {
        if (active) setResult({ key: requestKey, data })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, requestKey])

  if (gameId === null) {
    return <PageLayout><InvalidAddress gameId={null} /></PageLayout>
  }

  const linkState = { gameTitle, isHost }
  let content
  if (!currentResult) {
    content = <section className={styles.panel} role="status">투표를 불러오는 중…</section>
  } else if (currentResult.error) {
    content = (
      <LoadFailure
        error={currentResult.error}
        onRetry={() => setRetryCount((count) => count + 1)}
        backTo={`/games/${gameId}`}
      />
    )
  } else if (currentResult.data.polls.length === 0) {
    content = (
      <section className={styles.panel}>
        <h2>아직 투표가 없어요</h2>
        <p>{isHost ? '경기 참가자에게 물어볼 것이 있으면 투표를 만들어 보세요.' : '파티장이 투표를 만들면 이곳에서 참여할 수 있어요.'}</p>
      </section>
    )
  } else {
    content = (
      <ul className={styles.list} aria-label="투표 목록">
        {currentResult.data.polls.map((poll) => (
          <li key={poll.id}>
            <Link className={styles.pollLink} to={`/games/${gameId}/polls/${poll.id}`} state={linkState}>
              <PollBadges poll={poll} />
              <h2>{poll.title}</h2>
              <p className={styles.meta}>{poll.voterCount}명 참여 · {deadlineText(poll)}</p>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>경기 #{gameId}{gameTitle ? ` · ${gameTitle}` : ''}</p>
        <h1>의견 투표</h1>
        <p className={styles.intro}>파티장이 물어본 것에 경기 참가자가 함께 답해요.</p>
      </header>
      {isHost && (
        <Link className={styles.primaryLink} to={`/games/${gameId}/polls/new`} state={{ gameTitle }}>
          투표 만들기
        </Link>
      )}
      {content}
    </PageLayout>
  )
}

// 의견 투표 상세와 참여(GET·PUT /games/{gameId}/polls/{pollId}, BE D-34).
// 마감 전에는 다시 보내 내 선택을 전부 바꾸거나 빈 목록으로 취소할 수 있다. 결과는 득표 수와 투표자 닉네임까지 공개다.
export function PollDetailPage() {
  const { gameId: gameIdParam, pollId: pollIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const pollId = parsePollId(pollIdParam)
  const location = useLocation()
  const gameTitle = location.state?.gameTitle
  const justCreated = location.state?.created === true
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, poll } | { key, error }
  const [draft, setDraft] = useState(null) // { key, ids }
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null) // { key, message } | { key, error }
  const pending = useRef(false)
  const requestKey = `${gameId}:${pollId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null
  const poll = currentResult?.poll ?? null
  const saved = poll ? selectedOptionIds(poll) : []
  const selected = draft?.key === requestKey ? draft.ids : saved
  const currentSave = saveResult?.key === requestKey ? saveResult : null

  useEffect(() => {
    if (gameId === null || pollId === null) return
    let active = true
    getPoll(gameId, pollId)
      .then((data) => {
        if (active) setResult({ key: requestKey, poll: data })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, pollId, requestKey])

  async function submit(optionIds, doneMessage) {
    if (pending.current) return
    pending.current = true
    setSaving(true)
    setSaveResult(null)
    try {
      const updated = await answerPoll(gameId, pollId, optionIds)
      setResult({ key: requestKey, poll: updated })
      setDraft(null)
      setSaveResult({ key: requestKey, message: doneMessage })
    } catch (error) {
      setSaveResult({ key: requestKey, error: pollErrorMessage(error, '투표하지 못했습니다. 잠시 후 다시 시도해 주세요.') })
      // 마감됐거나 선택지가 바뀌었으면 최신 상태를 다시 받는다
      if (error?.code === 'POLL_409_1' || error?.code === 'POLL_404_2') {
        getPoll(gameId, pollId)
          .then((data) => setResult({ key: requestKey, poll: data }))
          .catch(() => {})
      }
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  if (gameId === null || pollId === null) {
    return <PageLayout><InvalidAddress gameId={gameId} /></PageLayout>
  }

  let content
  if (!currentResult) {
    content = <section className={styles.panel} role="status">투표를 불러오는 중…</section>
  } else if (currentResult.error) {
    content = (
      <LoadFailure
        error={currentResult.error}
        onRetry={() => setRetryCount((count) => count + 1)}
        backTo={`/games/${gameId}/polls`}
      />
    )
  } else {
    const changed = !sameSelection(selected, saved)
    const inputType = poll.allowMultiple ? 'checkbox' : 'radio'
    content = (
      <section className={styles.card} aria-labelledby="poll-title">
        <PollBadges poll={{ ...poll, hasVoted: saved.length > 0 }} />
        <h2 id="poll-title" className={styles.pollTitle}>{poll.title}</h2>
        <p className={styles.meta}>{poll.voterCount}명 참여 · {deadlineText(poll)}</p>

        <fieldset className={styles.options} disabled={poll.isClosed || saving}>
          <legend className={styles.srOnly}>선택지</legend>
          {poll.options.map((option) => {
            const checked = selected.includes(option.id)
            const ratio = poll.voterCount > 0 ? option.voteCount / poll.voterCount : 0
            return (
              <div key={option.id} className={`${styles.option} ${checked ? styles.optionSelected : ''}`}>
                <div className={styles.optionHead}>
                  <label className={styles.optionLabel}>
                    <input
                      type={inputType}
                      name={`poll-${poll.id}`}
                      checked={checked}
                      onChange={() => {
                        setDraft({ key: requestKey, ids: toggleSelection(selected, option.id, poll.allowMultiple) })
                        setSaveResult(null)
                      }}
                      onClick={() => {
                        // 라디오는 다시 눌러도 change가 없어서 해제를 여기서 처리한다
                        if (inputType === 'radio' && checked) {
                          setDraft({ key: requestKey, ids: [] })
                          setSaveResult(null)
                        }
                      }}
                    />
                    <span>{option.content}</span>
                  </label>
                  <span className={styles.voteCount}>{option.voteCount}표</span>
                </div>
                <div className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${ratio * 100}%` }} />
                </div>
                <p className={styles.voters}>
                  {option.voters.length > 0
                    ? option.voters.map((voter) => voter.nickname).join(', ')
                    : '아직 고른 사람이 없어요'}
                </p>
              </div>
            )
          })}
        </fieldset>

        {justCreated && !currentSave && <p className={styles.saved} role="status">투표를 만들었어요.</p>}
        {currentSave?.message && <p className={styles.saved} role="status">{currentSave.message}</p>}
        <ErrorMessage>{currentSave?.error}</ErrorMessage>

        {poll.isClosed ? (
          <p className={styles.meta}>마감된 투표예요. 결과만 볼 수 있어요.</p>
        ) : (
          <div className={styles.actions}>
            <Button
              onClick={() => submit(selected, saved.length > 0 ? '투표를 바꿨어요.' : '투표했어요.')}
              disabled={saving || !changed || selected.length === 0}
            >
              {saving ? '저장하는 중…' : saved.length > 0 ? '투표 바꾸기' : '투표하기'}
            </Button>
            {saved.length > 0 && (
              <Button variant="secondary" onClick={() => submit([], '투표를 취소했어요.')} disabled={saving}>
                투표 취소
              </Button>
            )}
          </div>
        )}
      </section>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}/polls`} state={{ gameTitle, isHost: location.state?.isHost }}>
        ← 투표 목록
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>경기 #{gameId}{gameTitle ? ` · ${gameTitle}` : ''}</p>
        <h1>의견 투표</h1>
      </header>
      {content}
    </PageLayout>
  )
}
