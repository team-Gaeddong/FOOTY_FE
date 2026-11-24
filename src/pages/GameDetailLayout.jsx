import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame } from '../api/games.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { ArrowLeftIcon, PinIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { parseGameId } from './gameDetail.js'
import styles from './GameDetailLayout.module.css'

// 다른 화면이 넘겨준 완료 안내(location.state.notice)
const NOTICE_MESSAGES = {
  'balance-reviewed': '밸런스 평가를 제출했어요.',
}

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '경기를 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 경기를 볼 수 있어요.'
  return '경기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 경기 상세의 탭 화면들(개요·라인업 …)이 함께 쓰는 틀. 경기를 한 번 불러(GET /games/{gameId}, BE D-25)
// 각 탭 화면에 Outlet context로 { game, onUpdated }를 넘기고, 불러오는 중·오류·없는 경기는 여기서 처리한다.
// 위쪽 틀(GameHeader)은 탭마다 안내 문구가 달라질 수 있어 각 탭 화면이 직접 그린다.
// onUpdated(game): 참가·경기 종료처럼 경기가 바뀐 뒤 최신 경기를 넘기면 모든 탭이 새 값을 쓴다.
export function GameDetailLayout() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const noticeMessage = NOTICE_MESSAGES[location.state?.notice]
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${gameId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (gameId === null) return
    let active = true
    getGame(gameId)
      .then((game) => {
        if (active) setResult({ key: requestKey, game })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, requestKey])

  const notFound =
    gameId === null ||
    (currentResult?.error instanceof ApiError && currentResult.error.code === 'GAME_404_1')

  let content
  if (notFound) {
    content = (
      <StateCard
        icon={<PinIcon size={22} />}
        title="경기를 찾을 수 없어요"
        actions={
          <>
            <Button as={Link} to="/" variant="secondary" fit="auto">
              경기 목록으로
            </Button>
            <span className={styles.code}>GAME_404_1</span>
          </>
        }
      >
        삭제됐거나 없는 경기예요.
      </StateCard>
    )
  } else if (!currentResult) {
    content = (
      <p className={styles.message} role="status">
        경기를 불러오는 중…
      </p>
    )
  } else if (currentResult.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{loadErrorMessage(currentResult.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 시도
        </Button>
      </div>
    )
  } else {
    content = (
      <Outlet
        context={{
          game: currentResult.game,
          onUpdated: (game) => setResult({ key: requestKey, game }),
        }}
      />
    )
  }

  return (
    <main className={styles.page}>
      <Link className={styles.back} to="/">
        <ArrowLeftIcon size={18} />
        경기 목록
      </Link>
      {noticeMessage && currentResult?.game && (
        <p className={styles.notice} role="status">
          {noticeMessage}
        </p>
      )}
      {content}
    </main>
  )
}
