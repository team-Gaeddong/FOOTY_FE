import { useEffect, useState } from 'react'
import { listGamePlayers } from '../../api/games.js'
import { getMyProfile } from '../../api/member.js'
import { Button } from '../../components/Button.jsx'
import { CheckIcon, UsersIcon } from '../../components/Icons.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { GameHostMenu } from './GameHostMenu.jsx'
import { GameJoinCard } from './GameJoinCard.jsx'
import { GamePlayersCard } from './GamePlayersCard.jsx'
import { GameProgress } from './GameProgress.jsx'
import { countUnratedPlayers, formatCreatedDateFull } from './gameDetail.js'
import { dateTimeLabel } from '../home/homeCalendar.js'
import styles from './GameOverview.module.css'

// 참가 선수 목록. 참가하면 playerCount가 바뀌므로 그 값을 요청 키에 넣어 목록을 다시 받는다.
function useGamePlayers(game) {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, players } | { key, error }
  const requestKey = `${game.id}:${game.playerCount}:${retryCount}`

  useEffect(() => {
    let active = true
    listGamePlayers(game.id)
      .then((data) => {
        if (active) setResult({ key: requestKey, players: data.players })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [game.id, requestKey])

  return {
    loaded: result?.key === requestKey ? result : null,
    retry: () => setRetryCount((count) => count + 1),
  }
}

// 내 회원 ID("나" 표시)와 선호 포지션(참가 신청 기본값). 못 불러와도 화면은 그대로 동작한다.
function useMyProfile() {
  const [profile, setProfile] = useState({ memberId: null, preferred: [] })

  useEffect(() => {
    let active = true
    getMyProfile()
      .then((data) => {
        if (active) {
          setProfile({
            memberId: data.memberId ?? null,
            preferred: (data.positions ?? []).map(({ position }) => position),
          })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return profile
}

// 개요 탭. 위에서부터 (파티장) 진행 단계, 그 아래 경기 정보·참가 선수와 오른쪽(모바일은 맨 위) 참가·메뉴 카드.
export function GameOverview({ game, onUpdated }) {
  const { loaded, retry } = useGamePlayers(game)
  const { memberId, preferred } = useMyProfile()
  const unrated = game.isHost && loaded?.players ? countUnratedPlayers(loaded.players) : null

  return (
    <div className={styles.overview}>
      {game.isHost && <GameProgress game={game} unrated={unrated} />}
      <div className={styles.columns} data-role={game.isHost ? 'host' : 'member'}>
        <div className={styles.side}>
          {game.isHost ? (
            <GameHostMenu game={game} unrated={unrated} />
          ) : game.isJoined ? (
            <ParticipantCard />
          ) : game.status === 'RECRUITING' ? (
            <GameJoinCard gameId={game.id} preferred={preferred} onUpdated={onUpdated} />
          ) : (
            <ClosedCard />
          )}
        </div>
        <InfoCard game={game} className={styles.info} />
        <GamePlayersCard
          game={game}
          loaded={loaded}
          memberId={memberId}
          onRetry={retry}
          className={styles.playersArea}
        />
      </div>
    </div>
  )
}

function InfoCard({ game, className = '' }) {
  const items = [
    ['일시', dateTimeLabel(game.playDate)],
    ['장소', game.location],
    ['파티장', game.host.nickname],
    ['정원', `${game.maxPlayers}명`],
    ['팀 수', `${game.teamCount}팀`],
    ['만든 날짜', formatCreatedDateFull(game.createdAt)],
  ]
  return (
    <section className={`${styles.card} ${className}`} aria-labelledby="info-title">
      <h2 id="info-title" className={styles.cardTitle}>
        경기 정보
      </h2>
      <dl className={styles.infoGrid}>
        {items.map(([label, value]) => (
          <div key={label} className={styles.infoItem}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// 이 경기에 참가한(파티장이 아닌) 회원이 보는 오른쪽 카드
function ParticipantCard() {
  return (
    <section className={styles.card} aria-labelledby="participant-title">
      <h2 id="participant-title" className={styles.cardTitle}>
        참가 완료
      </h2>
      <ul className={styles.notes}>
        <li>
          <CheckIcon size={16} />
          <span>이 경기에 참가했어요.</span>
        </li>
        <li>
          <CheckIcon size={16} />
          <span>팀이 정해지면 팀 탭에서 볼 수 있어요.</span>
        </li>
        <li>
          <CheckIcon size={16} />
          <span>공지와 투표는 위의 탭에서 볼 수 있어요.</span>
        </li>
      </ul>
    </section>
  )
}

// 모집이 끝난 경기에 참가하지 않은 회원이 보는 카드(시안 States "모집이 끝난 경기예요")
function ClosedCard() {
  return (
    <StateCard
      className={styles.closedCard}
      icon={<UsersIcon size={22} />}
      title="모집이 끝난 경기예요"
      actions={
        <>
          <Button variant="secondary" fit="auto" disabled>
            모집 마감
          </Button>
          <span className={styles.code}>GAME_409_1</span>
        </>
      }
    >
      팀이 확정됐거나 종료돼 더 참가할 수 없어요.
    </StateCard>
  )
}
