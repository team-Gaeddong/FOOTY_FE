import { Link } from 'react-router'
import { Badge } from '../../components/Badge.jsx'
import { CalendarIcon, LockIcon, PinIcon, UserIcon } from '../../components/Icons.jsx'
import {
  GAME_PASSED_LABEL,
  GAME_STATUS_LABELS,
  GAME_STATUS_TONES,
  canOpenMemberTabs,
  capacityNote,
  fillRatio,
  isGamePassed,
  toSummary,
} from './gameDetail.js'
import { isAfterOpen } from '../after/afterTab.js'
import { dateTimeLabel } from '../home/homeCalendar.js'
import styles from './GameHeader.module.css'

// 경기 상세 화면들이 함께 쓰는 위쪽 틀: 경기 정보(히어로)와 탭 바. current는 지금 탭('overview' | 'lineup' | 'notices' | 'polls' | 'after').
// countNote: 참가 인원 아래 안내를 바꾸고 싶을 때(팀 탭의 "선발 22명 · 후보 2명"). 없으면 정원 안내다.
// onLeave: 탭을 옮기기 전에 물어볼 때(팀 탭에서 저장하지 않은 변경). 이동을 막으려면 event.preventDefault()를 부른다.
// 공지·투표 탭은 파티장과 참가자만 열 수 있어(BE 403) 그 밖에는 자물쇠를 보여 준다.
export function GameHeader({ game, current = 'overview', countNote, onLeave }) {
  const memberTabsOpen = canOpenMemberTabs(game)
  const tabs = [
    { key: 'overview', label: '개요', to: `/games/${game.id}` },
    { key: 'lineup', label: '팀', to: `/games/${game.id}/lineup`, state: { game: toSummary(game) } },
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
    // 경기 후 탭은 종료된 경기에서만 보인다(밸런스 평가·MVP 투표·신고·재경기로 가는 링크 모음)
    ...(isAfterOpen(game)
      ? [{ key: 'after', label: '경기 후', to: `/games/${game.id}/after`, locked: !memberTabsOpen }]
      : []),
  ]
  const ratio = fillRatio(game.playerCount, game.maxPlayers)

  return (
    <>
      <section className={styles.hero} aria-labelledby="game-title">
        <div className={styles.main}>
          <div className={styles.badges}>
            <Badge tone={GAME_STATUS_TONES[game.status] ?? 'gray'}>
              {GAME_STATUS_LABELS[game.status] ?? game.status}
            </Badge>
            {isGamePassed(game) && <Badge tone="gray">{GAME_PASSED_LABEL}</Badge>}
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
            <span>{` / ${game.maxPlayers}명`}</span>
          </p>
          <div
            className={styles.meter}
            role="img"
            aria-label={`${game.maxPlayers} 중 ${game.playerCount}`}
          >
            <span style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <p className={styles.countNote}>
            {countNote ?? capacityNote(game.playerCount, game.maxPlayers)}
          </p>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="경기 메뉴">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            className={styles.tab}
            to={tab.to}
            state={tab.state}
            onClick={onLeave}
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
