import { startTransition, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { GAME_STATUS_LABELS, formatPlayDate } from './gameDetail.js'
import { loadMyGames } from './loadMyGames.js'
import { loadErrorMessage } from './myGames.js'
import styles from './MyGamesPage.module.css'

// 내가 만든(파티장인) 경기를 예정된 경기와 종료된 경기로 나눠 보여준다(제안서 ⑭·③).
// BE에 "내 경기" 필터가 없어 전체 목록을 받아 거른다(FD-21). 참여만 한 경기는 가져올 수 없다.
export function MyGamesPage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const current = result?.key === retryCount ? result : null

  useEffect(() => {
    let active = true

    loadMyGames()
      .then((data) => {
        if (active) setResult({ key: retryCount, data })
      })
      .catch((error) => {
        if (!active) return
        if (error?.code === 'MEMBER_404_1') {
          navigate('/login', { replace: true, state: { error: 'member_not_found' } })
          startTransition(() => clearSession())
          return
        }
        setResult({ key: retryCount, error })
      })

    return () => {
      active = false
    }
  }, [retryCount, navigate, clearSession])

  return (
    <PageLayout>
      <Link className={styles.backLink} to="/">← 홈으로</Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>내가 파티장인 경기</p>
          <h1>내 경기</h1>
          <p className={styles.intro}>
            내가 만든 경기를 예정된 경기와 종료된 경기로 나눠 볼 수 있어요. 참여만 한 경기는
            경기 목록에서 찾아 주세요.
          </p>
        </div>
        <div className={styles.headerLinks}>
          <Link className={styles.headerLink} to="/games/new">경기 만들기</Link>
          <Link className={styles.headerLink} to="/games">전체 경기 목록</Link>
        </div>
      </header>

      {!current ? (
        <div className={styles.messagePanel} role="status">내 경기를 불러오는 중…</div>
      ) : current.error ? (
        <section className={styles.messagePanel}>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button variant="secondary" onClick={() => setRetryCount((count) => count + 1)}>
            다시 시도
          </Button>
        </section>
      ) : (
        <MyGamesContent data={current.data} />
      )}
    </PageLayout>
  )
}

function MyGamesContent({ data }) {
  const { upcoming, finished, truncated } = data
  const isEmpty = upcoming.length === 0 && finished.length === 0

  return (
    <>
      {truncated && (
        <p className={styles.truncatedNotice} role="status">
          경기가 많아 일부만 불러왔어요. 일정이 먼 경기가 보이지 않을 수 있어요.
        </p>
      )}
      {isEmpty ? (
        <section className={styles.messagePanel}>
          <h2>{truncated ? '불러온 경기 중에는 내가 만든 경기가 없어요' : '아직 만든 경기가 없어요'}</h2>
          <p>{truncated ? '경기를 직접 만들면 여기에 모여요.' : '첫 경기를 직접 만들어 보세요.'}</p>
          <Link className={styles.emptyLink} to="/games/new">경기 만들기</Link>
        </section>
      ) : (
        <>
          <MyGameSection id="upcoming" title="예정된 경기" games={upcoming} emptyText="예정된 경기가 없어요." />
          <MyGameSection id="finished" title="종료된 경기" games={finished} emptyText="종료된 경기가 없어요." />
        </>
      )}
    </>
  )
}

function MyGameSection({ id, title, games, emptyText }) {
  const headingId = `my-games-${id}`

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHeader}>
        <h2 id={headingId}>{title}</h2>
        <span className={styles.count}>{games.length}개</span>
      </div>
      {games.length === 0 ? (
        <p className={styles.emptyText}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {games.map((game) => (
            <li key={game.id}>
              <article className={styles.card} aria-labelledby={`my-game-title-${game.id}`}>
                <span
                  className={`${styles.status} ${game.status === 'FINISHED' ? styles.statusFinished : ''}`}
                >
                  {GAME_STATUS_LABELS[game.status] ?? game.status}
                </span>
                <h3 id={`my-game-title-${game.id}`}>{game.title}</h3>
                <dl>
                  <div><dt>경기 일시</dt><dd>{formatPlayDate(game.playDate)}</dd></div>
                  <div><dt>장소</dt><dd>{game.location}</dd></div>
                </dl>
                <Link
                  className={styles.detailLink}
                  to={`/games/${game.id}`}
                  aria-label={`${game.title} 경기 상세·관리`}
                >
                  경기 상세·관리
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
