import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { listGamesInRange } from '../../api/games.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChevronRightIcon,
  PlusIcon,
} from '../../components/Icons.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { GameStatusBadge } from '../gameDetail/GameStatusBadge.jsx'
import {
  DAYS_PER_VIEW,
  addDays,
  buildDays,
  dayAriaLabel,
  dayHeading,
  gameSubtitle,
  groupGamesByDate,
  homeErrorMessage,
  pickSelectedDay,
  playTime,
  rangeLabel,
  todayString,
  windowEnd,
} from './homeCalendar.js'
import styles from './HomePage.module.css'

// 다른 화면이 넘겨준 완료 안내(location.state.notice). /games는 이 화면으로 보내면서 state를 그대로 넘긴다.
const NOTICE_MESSAGES = {
  'game-deleted': '경기를 삭제했어요.',
}

// 경기 목록(홈). 오늘부터 7일의 날짜 줄과 고른 날의 경기를 보여 준다.
export function HomePage() {
  const location = useLocation()
  const [today] = useState(() => todayString())
  const [windowStart, setWindowStart] = useState(today)
  const [selected, setSelected] = useState(today)
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${windowStart}:${retryCount}`
  const current = result?.key === requestKey ? result : null
  const noticeMessage = NOTICE_MESSAGES[location.state?.notice]

  useEffect(() => {
    let active = true

    listGamesInRange({ from: windowStart, to: windowEnd(windowStart) })
      .then((games) => {
        if (active) setResult({ key: requestKey, games })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })

    return () => {
      active = false
    }
  }, [windowStart, requestKey])

  function moveWindow(offset) {
    const nextStart = addDays(windowStart, offset * DAYS_PER_VIEW)
    setWindowStart(nextStart)
    setSelected(pickSelectedDay(nextStart, today))
  }

  const days = buildDays(windowStart, today)
  const gamesByDate = current?.games ? groupGamesByDate(current.games) : null
  const dayGames = gamesByDate?.[selected] ?? []

  return (
    <main className={styles.page}>
      {noticeMessage && (
        <p className={styles.notice} role="status">
          {noticeMessage}
        </p>
      )}

      <section className={styles.banner}>
        <div className={styles.bannerText}>
          <h1 className={styles.bannerTitle}>이번 주 경기, 직접 열어 보세요</h1>
          <p className={styles.bannerLead}>날짜·장소·인원만 정하면 바로 모집을 시작해요.</p>
          <div className={styles.bannerAction}>
            <Button as={Link} to="/games/new" fit="auto" className={styles.bannerButton}>
              <PlusIcon size={18} />
              경기 만들기
            </Button>
          </div>
        </div>
        <div className={styles.pitch} aria-hidden="true">
          <span className={styles.pitchLine} />
          <span className={styles.pitchCircle} />
          <span className={`${styles.pitchBox} ${styles.pitchBoxLeft}`} />
          <span className={`${styles.pitchBox} ${styles.pitchBoxRight}`} />
        </div>
      </section>

      <section className={styles.strip}>
        <h2 className={styles.stripTitle}>이번 주 경기</h2>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="이전 7일"
            onClick={() => moveWindow(-1)}
          >
            <ArrowLeftIcon size={20} />
          </button>
          <span className={styles.rangeLabel}>{rangeLabel(windowStart)}</span>
          <button
            type="button"
            className={styles.arrow}
            aria-label="다음 7일"
            onClick={() => moveWindow(1)}
          >
            <ArrowRightIcon size={20} />
          </button>
        </div>
        <div className={styles.days} role="group" aria-label="날짜 선택">
          {days.map((day) => {
            const hasGames = Boolean(gamesByDate?.[day.date]?.length)
            return (
              <button
                key={day.date}
                type="button"
                className={[styles.day, styles[day.tone], hasGames && styles.hasGames]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={day.date === selected}
                aria-label={dayAriaLabel(day.date, hasGames)}
                onClick={() => setSelected(day.date)}
              >
                <span className={styles.dayLabel}>{day.isToday ? '오늘' : day.weekday}</span>
                <span className={styles.dayNumber}>{day.day}</span>
                <span className={styles.dot} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.daySection} aria-labelledby="day-heading">
        <div className={styles.dayHeader}>
          <h3 id="day-heading" className={styles.dayTitle}>
            {dayHeading(selected)}
          </h3>
          {current?.games && <span className={styles.dayCount}>{dayGames.length}경기</span>}
          {dayGames.length > 1 && <span className={styles.dayOrder}>시작 시간 순</span>}
        </div>

        {!current ? (
          <p className={styles.message} role="status">
            경기를 불러오는 중…
          </p>
        ) : current.error ? (
          <div className={styles.message}>
            <ErrorMessage>{homeErrorMessage(current.error)}</ErrorMessage>
            <Button
              variant="secondary"
              fit="auto"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              다시 시도
            </Button>
          </div>
        ) : dayGames.length === 0 ? (
          <StateCard
            compact
            icon={<CalendarIcon size={22} />}
            title="이 날은 경기가 없어요"
            actions={
              <Button as={Link} to="/games/new" fit="auto">
                경기 만들기
              </Button>
            }
          >
            다른 날짜를 고르거나 직접 경기를 만들어 보세요.
          </StateCard>
        ) : (
          <ul className={styles.list}>
            {dayGames.map((game) => (
              <li key={game.id}>
                <Link className={styles.row} to={`/games/${game.id}`}>
                  <span className={styles.time}>{playTime(game.playDate)}</span>
                  <span className={styles.info}>
                    <span className={styles.gameTitle}>{game.title}</span>
                    <span className={styles.sub}>{gameSubtitle(game)}</span>
                  </span>
                  <GameStatusBadge game={game} className={styles.status} />
                  <span className={styles.chevron}>
                    <ChevronRightIcon size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
