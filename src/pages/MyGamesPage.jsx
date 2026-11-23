import { startTransition, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import {
  ArrowRightIcon,
  CalendarIcon,
  PinIcon,
  PlusIcon,
  RepeatIcon,
  UsersIcon,
} from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { GAME_STATUS_LABELS } from './gameDetail.js'
import { capacityText, dateTimeLabel } from './homeCalendar.js'
import { loadMyGames } from './loadMyGames.js'
import { loadErrorMessage, statusGuide } from './myGames.js'
import styles from './MyGamesPage.module.css'

const STATUS_TONES = { RECRUITING: 'green', CONFIRMED: 'navy', FINISHED: 'gray' }

// 내가 파티장인 경기를 예정된 경기와 종료된 경기로 나눠 보여준다(제안서 ⑭·③).
// BE `GET /games?role=host`(BE D-37)로 받는다. 참여만 한 경기는 시안에 없어 보여주지 않는다.
export function MyGamesPage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const current = result?.key === retryCount ? result : null

  useEffect(() => {
    let active = true

    loadMyGames({ isActive: () => active })
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
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>내 경기</h1>
          <p className={styles.lead}>내가 파티장으로 만든 경기예요.</p>
        </div>
        <Button as={Link} to="/games/new" fit="auto" className={styles.create}>
          <PlusIcon size={18} />
          경기 만들기
        </Button>
      </header>

      {!current ? (
        <p className={styles.message} role="status">
          내 경기를 불러오는 중…
        </p>
      ) : current.error ? (
        <div className={styles.message}>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button
            variant="secondary"
            fit="auto"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <MyGamesContent data={current.data} />
      )}
    </main>
  )
}

function MyGamesContent({ data }) {
  const { upcoming, finished, truncated } = data
  const isEmpty = upcoming.length === 0 && finished.length === 0

  return (
    <>
      {truncated && (
        <p className={styles.notice} role="status">
          경기가 많아 일부만 불러왔어요. 일정이 먼 경기가 보이지 않을 수 있어요.
        </p>
      )}
      {isEmpty ? (
        <StateCard
          icon={<CalendarIcon size={22} />}
          title={truncated ? '불러온 경기 중에는 내가 만든 경기가 없어요' : '아직 만든 경기가 없어요'}
          actions={
            <Button as={Link} to="/games/new" fit="auto">
              경기 만들기
            </Button>
          }
        >
          {truncated ? '경기를 직접 만들면 여기에 모여요.' : '첫 경기를 직접 만들어 보세요.'}
        </StateCard>
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
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
        </h2>
        <span className={styles.count}>{games.length}개</span>
      </div>
      {games.length === 0 ? (
        <p className={styles.emptyText}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {games.map((game) => (
            <li key={game.id}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GameCard({ game }) {
  const titleId = `my-game-title-${game.id}`

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.badgeRow}>
        <Badge tone={STATUS_TONES[game.status] ?? 'gray'}>
          {GAME_STATUS_LABELS[game.status] ?? game.status}
        </Badge>
      </div>
      <h3 id={titleId} className={styles.cardTitle}>
        {game.title}
      </h3>
      <ul className={styles.meta}>
        <li>
          <CalendarIcon size={16} />
          <span>{dateTimeLabel(game.playDate)}</span>
        </li>
        <li>
          <PinIcon size={16} />
          <span>{game.location}</span>
        </li>
        <li>
          <UsersIcon size={16} />
          <span>{capacityText(game)}</span>
        </li>
      </ul>
      <hr className={styles.divider} />
      <div className={styles.footer}>
        <p className={styles.guide}>{statusGuide(game.status)}</p>
        {game.status === 'FINISHED' ? (
          <Button
            as={Link}
            to={`/games/${game.id}/rematch`}
            state={{ sourceGame: game }}
            variant="secondary"
            fit="auto"
            aria-label={`${game.title}, 재경기 만들기`}
          >
            <RepeatIcon size={18} />
            재경기 만들기
          </Button>
        ) : (
          <Button
            as={Link}
            to={`/games/${game.id}`}
            variant={game.status === 'RECRUITING' ? 'primary' : 'secondary'}
            fit="auto"
            aria-label={`${game.title}, 경기 관리`}
          >
            경기 관리
            <ArrowRightIcon size={18} />
          </Button>
        )}
      </div>
    </article>
  )
}
