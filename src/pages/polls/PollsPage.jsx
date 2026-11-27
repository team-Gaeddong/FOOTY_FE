import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext, useParams } from 'react-router'
import { getPoll, listPolls } from '../../api/polls.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { BarChartIcon, LockIcon, PlusIcon } from '../../components/Icons.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { GameHeader } from '../gameDetail/GameHeader.jsx'
import { PollDetail } from './PollDetail.jsx'
import { PollStatusBadges } from './PollStatusBadges.jsx'
import { canOpenMemberTabs } from '../gameDetail/gameDetail.js'
import {
  applyAnswerToList,
  parsePollId,
  pickPoll,
  pollErrorMessage,
  pollMeta,
} from './polls.js'
import styles from './PollsPage.module.css'

const LOAD_FAILED = '투표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

// 경기 상세의 투표 탭(/games/:gameId/polls, /polls/:pollId, 시안 Polls).
// 투표는 파티장과 경기 참가 회원만 볼 수 있다(BE POLL_403_1). 참가 여부를 알면 부르기 전에 막고, 서버가 403을 줘도 같은 카드를 보여 준다.
export function PollsPage() {
  const { game } = useOutletContext()
  const params = useParams()
  // 주소에 투표 번호가 없으면 null(가장 최근 투표), 있는데 숫자가 아니면 어느 투표도 아닌 값(-1)이다
  const pollId = params.pollId === undefined ? null : (parsePollId(params.pollId) ?? -1)
  const open = canOpenMemberTabs(game)
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, polls } | { key, error }
  const requestKey = `${game.id}:${retryCount}`
  const loaded = result?.key === requestKey ? result : null

  useEffect(() => {
    if (!open) return
    let active = true
    listPolls(game.id)
      .then((data) => {
        if (active) setResult({ key: requestKey, polls: data.polls })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [game.id, open, requestKey])

  let content
  if (!open || loaded?.error?.code === 'POLL_403_1') {
    content = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="참가자만 볼 수 있어요"
        actions={
          <>
            {game.status === 'RECRUITING' && (
              <Button as={Link} to={`/games/${game.id}`} fit="auto">
                경기 참가하기
              </Button>
            )}
            <span className={styles.code}>POLL_403_1</span>
          </>
        }
      >
        공지와 투표는 파티장과 이 경기 참가자에게만 열려요.
      </StateCard>
    )
  } else if (!loaded) {
    content = (
      <p className={styles.message} role="status">
        투표를 불러오는 중…
      </p>
    )
  } else if (loaded.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{pollErrorMessage(loaded.error, LOAD_FAILED)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 시도
        </Button>
      </div>
    )
  } else {
    content = (
      <PollBrowser
        game={game}
        polls={loaded.polls}
        pollId={pollId}
        onPollsChange={(polls) => setResult({ key: requestKey, polls })}
      />
    )
  }

  return (
    <>
      <GameHeader game={game} current="polls" />
      {content}
    </>
  )
}

function PollBrowser({ game, polls, pollId, onPollsChange }) {
  const location = useLocation()
  const justCreated = location.state?.created === true
  const { poll: selected, missing } = pickPoll(polls, pollId)

  const createButton = game.isHost && (
    <Button as={Link} to={`/games/${game.id}/polls/new`} fit="auto">
      <PlusIcon size={18} />
      투표 만들기
    </Button>
  )

  if (polls.length === 0) {
    return (
      <StateCard
        icon={<BarChartIcon size={22} />}
        title="아직 투표가 없어요"
        actions={createButton || undefined}
      >
        {game.isHost
          ? '참가자에게 물어볼 것이 있으면 투표를 만들어 보세요.'
          : '파티장이 투표를 만들면 여기서 참여할 수 있어요.'}
      </StateCard>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="polls-title">
      <div className={styles.toolbar}>
        <h2 id="polls-title" className={styles.count}>
          투표 {polls.length}개
        </h2>
        {createButton}
      </div>

      {missing ? (
        <StateCard
          compact
          icon={<BarChartIcon size={22} />}
          title="투표를 찾을 수 없어요"
          actions={
            <Button as={Link} to={`/games/${game.id}/polls`} variant="secondary" fit="auto">
              투표 목록으로
            </Button>
          }
        >
          삭제됐거나 이 경기의 투표가 아니에요.
        </StateCard>
      ) : (
        <div className={styles.split}>
          <ul className={styles.list} aria-label="투표 목록">
            {polls.map((poll) => (
              <li key={poll.id} data-selected={poll.id === selected.id}>
                <Link
                  className={styles.card}
                  to={`/games/${game.id}/polls/${poll.id}`}
                  aria-current={poll.id === selected.id ? 'true' : undefined}
                >
                  <PollStatusBadges poll={poll} />
                  <span className={styles.cardTitle}>{poll.title}</span>
                  <span className={styles.cardMeta}>{pollMeta(poll)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <SelectedPoll
            key={selected.id}
            gameId={game.id}
            pollId={selected.id}
            justCreated={justCreated}
            onAnswered={(poll) => onPollsChange(applyAnswerToList(polls, poll))}
          />
        </div>
      )}
    </section>
  )
}

// 고른 투표의 상세. 목록에는 선택지가 없어 따로 받는다(GET /games/{id}/polls/{pollId}).
// 모바일에서는 목록 카드를 눌러 다른 투표를 열면 이 상세로 화면을 올려 준다.
function SelectedPoll({ gameId, pollId, justCreated, onAnswered }) {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, poll } | { key, error }
  const ref = useRef(null)
  const firstRender = useRef(true)
  const requestKey = `${pollId}:${retryCount}`
  const loaded = result?.key === requestKey ? result : null

  useEffect(() => {
    let active = true
    getPoll(gameId, pollId)
      .then((poll) => {
        if (active) setResult({ key: requestKey, poll })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, pollId, requestKey])

  // 저장이 마감·선택지 변경으로 거절되면 화면을 비우지 않고(오류 안내를 유지한 채) 최신 상태로 바꾼다
  function refresh() {
    getPoll(gameId, pollId)
      .then((poll) => setResult({ key: requestKey, poll }))
      .catch(() => {})
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!window.matchMedia('(min-width: 1024px)').matches) ref.current?.scrollIntoView({ block: 'start' })
  }, [])

  let body
  if (!loaded) {
    body = <p className={styles.text} role="status">투표를 불러오는 중…</p>
  } else if (loaded.error) {
    body = (
      <>
        <ErrorMessage>{pollErrorMessage(loaded.error, LOAD_FAILED)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 시도
        </Button>
      </>
    )
  } else {
    body = (
      <PollDetail
        gameId={gameId}
        poll={loaded.poll}
        justCreated={justCreated}
        onChange={(poll) => {
          setResult({ key: requestKey, poll })
          onAnswered(poll)
        }}
        onRefresh={refresh}
      />
    )
  }

  return (
    <article ref={ref} className={styles.detail} aria-label="투표 내용">
      {body}
    </article>
  )
}
