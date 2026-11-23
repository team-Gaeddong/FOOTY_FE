import { Link } from 'react-router'
import { Badge } from '../components/Badge.jsx'
import { CalendarIcon, LockIcon, PinIcon, UserIcon } from '../components/Icons.jsx'
import {
  GAME_STATUS_LABELS,
  canOpenMemberTabs,
  capacityNote,
  fillRatio,
  toSummary,
} from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import styles from './GameHeader.module.css'

const STATUS_TONES = { RECRUITING: 'green', CONFIRMED: 'navy', FINISHED: 'gray' }

// 경기 상세 화면들이 함께 쓰는 위쪽 틀: 경기 정보(히어로)와 탭 바. current는 지금 탭('overview' | 'lineup' | 'notices' | 'polls').
// 공지·투표 탭은 파티장과 참가자만 열 수 있어(BE 403) 그 밖에는 자물쇠를 보여 준다.
export function GameHeader({ game, current = 'overview' }) {
  const memberTabsOpen = canOpenMemberTabs(game)
  const tabs = [
    { key: 'overview', label: '개요', to: `/games/${game.id}` },
    { key: 'lineup', label: '라인업', to: `/games/${game.id}/lineup`, state: { game: toSummary(game) } },
    {
      key: 'notices',
      label: '공지',
      to: `/games/${game.id}/notices`,
      state: { gameTitle: game.title },
      locked: !memberTabsOpen,
    },
    {
      key: 'polls',
      label: '투표',
      to: `/games/${game.id}/polls`,
      state: { gameTitle: game.title, isHost: game.isHost },
      locked: !memberTabsOpen,
    },
  ]
  const ratio = fillRatio(game.playerCount, game.maxPlayers)

  return (
    <>
      <section className={styles.hero} aria-labelledby="game-title">
        <div className={styles.main}>
          <div className={styles.badges}>
            <Badge tone={STATUS_TONES[game.status] ?? 'gray'}>
              {GAME_STATUS_LABELS[game.status] ?? game.status}
            </Badge>
            {game.isHost ? (
              <Badge tone="deep">내가 만든 경기</Badge>
            ) : game.isJoined ? (
              <Badge tone="deep">참가 중</Badge>
            ) : null}
          </div>
          <h1 id="game-title" className={styles.title}>
            {game.title}
          </h1>
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
              <UserIcon size={16} />
              <span>파티장 {game.host.nickname}</span>
            </li>
          </ul>
        </div>

        <div className={styles.count}>
          <p className={styles.countLabel}>참가 인원</p>
          <p className={styles.countValue}>
            <strong>{game.playerCount}</strong>
            <span> / {game.maxPlayers}명</span>
          </p>
          <div
            className={styles.meter}
            role="img"
            aria-label={`${game.maxPlayers} 중 ${game.playerCount}`}
          >
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className={styles.countNote}>{capacityNote(game.playerCount, game.maxPlayers)}</p>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="경기 메뉴">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            className={styles.tab}
            to={tab.to}
            state={tab.state}
            aria-current={tab.key === current ? 'page' : undefined}
            aria-label={tab.locked ? `${tab.label} (참가자 전용)` : undefined}
          >
            {tab.label}
            {tab.locked && <LockIcon size={14} />}
          </Link>
        ))}
      </nav>
    </>
  )
}
