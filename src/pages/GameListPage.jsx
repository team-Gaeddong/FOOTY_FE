import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { listGames } from '../api/games.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './GameListPage.module.css'

const PAGE_SIZE = 20

const STATUS_LABELS = {
  RECRUITING: '모집 중',
  CONFIRMED: '팀 확정',
  FINISHED: '경기 종료',
}

function parsePage(value) {
  if (value === null) return 0
  if (!/^\d+$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) && page <= 2147483647 ? page : null
}

function formatDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return value
  return `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`
}

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '경기 목록을 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GLOBAL_400_1') return '페이지 요청이 올바르지 않습니다.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 경기 목록을 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '경기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function GameListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const page = parsePage(searchParams.get('page'))
  const requestKey = `${page}:${retryCount}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    if (page === null) return
    let active = true

    listGames({ page, size: PAGE_SIZE })
      .then((data) => {
        if (active) setResult({ key: requestKey, data })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })

    return () => {
      active = false
    }
  }, [page, requestKey])

  function goToPage(nextPage) {
    setSearchParams(nextPage === 0 ? {} : { page: String(nextPage) })
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to="/">← 홈으로</Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>함께 뛸 경기</p>
          <h1>경기 목록</h1>
          <p className={styles.intro}>지난 경기까지 경기 일시 순서로 볼 수 있어요.</p>
        </div>
        <Link className={styles.createLink} to="/games/new">경기 만들기</Link>
      </header>

      {page === null ? (
        <section className={styles.messagePanel}>
          <ErrorMessage>페이지 번호가 올바르지 않습니다.</ErrorMessage>
          <Button variant="secondary" onClick={() => goToPage(0)}>첫 페이지 보기</Button>
        </section>
      ) : !currentResult ? (
        <div className={styles.messagePanel} role="status">경기 목록을 불러오는 중…</div>
      ) : currentResult.error ? (
        <section className={styles.messagePanel}>
          <ErrorMessage>{errorMessage(currentResult.error)}</ErrorMessage>
          <Button variant="secondary" onClick={() => setRetryCount((count) => count + 1)}>
            다시 시도
          </Button>
        </section>
      ) : (
        <GameListContent data={currentResult.data} page={page} goToPage={goToPage} />
      )}
    </PageLayout>
  )
}

function GameListContent({ data, page, goToPage }) {
  if (data.games.length === 0) {
    const hasGamesElsewhere = data.totalElements > 0
    return (
      <section className={styles.messagePanel}>
        <h2>{hasGamesElsewhere ? '이 페이지에는 경기가 없어요' : '아직 등록된 경기가 없어요'}</h2>
        <p>{hasGamesElsewhere ? '첫 페이지부터 다시 살펴보세요.' : '첫 경기를 직접 만들어 보세요.'}</p>
        {hasGamesElsewhere ? (
          <Button variant="secondary" onClick={() => goToPage(0)}>첫 페이지 보기</Button>
        ) : (
          <Link className={styles.emptyLink} to="/games/new">경기 만들기</Link>
        )}
      </section>
    )
  }

  return (
    <section className={styles.results} aria-label="경기 목록 결과">
      <p className={styles.count}>전체 {data.totalElements}개 경기</p>
      <ul className={styles.list}>
        {data.games.map((game) => (
          <li key={game.id}>
            <article className={styles.card} aria-labelledby={`game-title-${game.id}`}>
              <span className={styles.status}>{STATUS_LABELS[game.status] ?? game.status}</span>
              <h2 id={`game-title-${game.id}`}>{game.title}</h2>
              <dl>
                <div><dt>경기 일시</dt><dd>{formatDateTime(game.playDate)}</dd></div>
                <div><dt>장소</dt><dd>{game.location}</dd></div>
                <div><dt>참가 정원</dt><dd>{game.maxPlayers}명</dd></div>
                <div><dt>팀 수</dt><dd>{game.teamCount}팀</dd></div>
              </dl>
            </article>
          </li>
        ))}
      </ul>
      {data.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="경기 목록 페이지">
          <Button variant="secondary" onClick={() => goToPage(page - 1)} disabled={page === 0}>
            이전
          </Button>
          <span>{page + 1} / {data.totalPages}</span>
          <Button variant="secondary" onClick={() => goToPage(page + 1)} disabled={page + 1 >= data.totalPages}>
            다음
          </Button>
        </nav>
      )}
    </section>
  )
}
