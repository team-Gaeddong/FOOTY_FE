import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getNotice, listNotices } from '../api/notices.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
import { formatNoticeDateTime } from './noticeDate.js'
import styles from './NoticePage.module.css'

function parseNoticeId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '공지사항을 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GAME_403_1') return '이 경기의 파티장 또는 참여자만 공지를 볼 수 있어요.'
  if (error.code === 'GAME_404_1') return '경기 또는 공지를 찾을 수 없어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 공지를 확인할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function InvalidAddress({ gameId }) {
  const to = gameId === null ? '/games' : `/games/${gameId}/notices`
  return (
    <section className={styles.panel}>
      <h1>공지 주소를 확인해 주세요</h1>
      <p>경기 목록이나 경기 상세에서 다시 열어 주세요.</p>
      <Link className={styles.secondaryLink} to={to}>
        {gameId === null ? '경기 목록으로' : '공지 목록으로'}
      </Link>
    </section>
  )
}

function LoadFailure({ error, onRetry, backTo }) {
  return (
    <section className={styles.panel}>
      <ErrorMessage>{errorMessage(error)}</ErrorMessage>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onRetry}>다시 시도</Button>
        <Link className={styles.secondaryLink} to={backTo}>돌아가기</Link>
      </div>
    </section>
  )
}

export function NoticeListPage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const gameTitle = location.state?.gameTitle
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${gameId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (gameId === null) return
    let active = true
    listNotices(gameId)
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

  let content
  if (!currentResult) {
    content = <section className={styles.panel} role="status">공지사항을 불러오는 중…</section>
  } else if (currentResult.error) {
    content = (
      <LoadFailure
        error={currentResult.error}
        onRetry={() => setRetryCount((count) => count + 1)}
        backTo={`/games/${gameId}`}
      />
    )
  } else if (currentResult.data.notices.length === 0) {
    content = (
      <section className={styles.panel}>
        <h2>등록된 공지사항이 없어요</h2>
        <p>새로운 공지가 등록되면 이곳에서 확인할 수 있어요.</p>
        <Link className={styles.secondaryLink} to={`/games/${gameId}`}>경기 상세로</Link>
      </section>
    )
  } else {
    content = (
      <ul className={styles.list} aria-label="공지사항 목록">
        {currentResult.data.notices.map((notice) => (
          <li key={notice.id}>
            <Link
              className={styles.noticeLink}
              to={`/games/${gameId}/notices/${notice.id}`}
              state={{ gameTitle }}
            >
              <article>
                <time className={styles.createdAt} dateTime={notice.createdAt}>
                  {formatNoticeDateTime(notice.createdAt)}
                </time>
                <h2>{notice.title}</h2>
                <p>{notice.content}</p>
                <span className={styles.detailLink}>내용 보기 <span aria-hidden="true">→</span></span>
              </article>
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
        <h1>공지사항</h1>
        <p className={styles.intro}>파티장이 경기 참여자에게 전한 안내예요.</p>
      </header>
      {content}
    </PageLayout>
  )
}

export function NoticeDetailPage() {
  const { gameId: gameIdParam, noticeId: noticeIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const noticeId = parseNoticeId(noticeIdParam)
  const location = useLocation()
  const gameTitle = location.state?.gameTitle
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${gameId}:${noticeId}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (gameId === null || noticeId === null) return
    let active = true
    getNotice(gameId, noticeId)
      .then((notice) => {
        if (active) setResult({ key: requestKey, notice })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [gameId, noticeId, requestKey])

  if (gameId === null || noticeId === null) {
    return <PageLayout><InvalidAddress gameId={gameId} /></PageLayout>
  }

  let content
  if (!currentResult) {
    content = <section className={styles.panel} role="status">공지사항을 불러오는 중…</section>
  } else if (currentResult.error) {
    content = (
      <LoadFailure
        error={currentResult.error}
        onRetry={() => setRetryCount((count) => count + 1)}
        backTo={`/games/${gameId}/notices`}
      />
    )
  } else {
    content = (
      <article className={styles.detail}>
        <time className={styles.createdAt} dateTime={currentResult.notice.createdAt}>
          {formatNoticeDateTime(currentResult.notice.createdAt)}
        </time>
        <h1>{currentResult.notice.title}</h1>
        <p className={styles.detailContent}>{currentResult.notice.content}</p>
      </article>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}/notices`}>← 공지 목록</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>경기 #{gameId}{gameTitle ? ` · ${gameTitle}` : ''}</p>
        <h1>공지사항 확인</h1>
      </header>
      {content}
    </PageLayout>
  )
}
