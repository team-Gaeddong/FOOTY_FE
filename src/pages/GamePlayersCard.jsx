import { Avatar } from '../components/Avatar.jsx'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PositionChips } from '../components/PositionChips.jsx'
import { countUnratedPlayers, playerBadges } from './gameDetail.js'
import styles from './GameOverview.module.css'

function playersErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error?.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  return '참가 선수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 참가 선수 목록(GET /games/{gameId}/players, BE D-20). 로그인한 회원 누구나 보고, 실력은 파티장에게만 내려온다.
// loaded는 { players } | { error } | null(불러오는 중)이다. memberId는 "나" 표시에 쓰고 모르면 null이다.
export function GamePlayersCard({ game, loaded, memberId, onRetry, className = '' }) {
  const players = loaded?.players ?? []
  const unrated = game.isHost ? countUnratedPlayers(players) : 0

  return (
    <section
      className={`${styles.card} ${className}`}
      aria-labelledby="players-title"
      aria-busy={!loaded}
    >
      <div className={styles.cardHeader}>
        <h2 id="players-title" className={styles.cardTitle}>
          참가 선수
        </h2>
        {loaded?.players && (
          <div className={styles.cardMeta}>
            <span className={styles.cardCount}>{players.length}명</span>
            {game.isHost && players.length > 0 && (
              <Badge tone={unrated > 0 ? 'red' : 'green'}>
                {unrated > 0 ? `실력 미입력 ${unrated}명` : '실력 모두 입력'}
              </Badge>
            )}
          </div>
        )}
      </div>

      {!loaded ? (
        <p className={styles.listStatus} role="status">
          참가 선수를 불러오는 중…
        </p>
      ) : loaded.error ? (
        <div className={styles.listStatus}>
          <ErrorMessage>{playersErrorMessage(loaded.error)}</ErrorMessage>
          <Button variant="secondary" fit="auto" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : players.length === 0 ? (
        <p className={styles.listStatus}>아직 참가한 선수가 없어요.</p>
      ) : (
        <ul className={styles.players}>
          {players.map((player) => {
            const isMe = memberId !== null && player.memberId === memberId
            return (
              <li key={player.id} className={styles.player}>
                <Avatar name={player.name} tone={isMe ? 'brand' : 'neutral'} />
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    <span>{player.name}</span>
                    {isMe && <Badge tone="brand">나</Badge>}
                    {playerBadges(player, game.host.id).map((badge) => (
                      <Badge key={badge} tone={badge === '파티장' ? 'deep' : 'gray'}>
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  {player.positions?.length ? (
                    <PositionChips positions={player.positions} />
                  ) : (
                    <span className={styles.noPositions}>희망 포지션 없음</span>
                  )}
                </div>
                {game.isHost &&
                  (player.skillLevel === null ? (
                    <Badge tone="red">미입력</Badge>
                  ) : (
                    <span className={styles.skill}>
                      <span className={styles.skillLabel}>실력</span>
                      <span className={styles.skillValue}>{player.skillLevel}</span>
                    </span>
                  ))}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
