import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { deleteGame } from '../api/games.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import {
  ArrowRightIcon,
  BarChartIcon,
  MegaphoneIcon,
  SwapIcon,
  TrashIcon,
} from '../components/Icons.jsx'
import {
  canDeleteGame,
  deleteErrorMessage,
  lineupLocked,
  nextTask,
  toSummary,
} from './gameDetail.js'
import styles from './GameOverview.module.css'

// 파티장 메뉴. 노출만 조절하고 권한은 각 화면에서 BE 응답(GAME_403_1)으로 판단한다.
// unrated: 실력을 아직 안 매긴 선수 수(목록을 못 받았으면 null)
export function GameHostMenu({ game, unrated, className = '' }) {
  const info = { status: game.status, playerCount: game.playerCount, unrated }
  const task = nextTask(info)
  const summaryState = { game: toSummary(game) }
  const actionTarget = {
    skill: { to: `/games/${game.id}/skill-levels`, state: summaryState },
    lineup: { to: `/games/${game.id}/lineup`, state: summaryState },
    viewLineup: { to: `/games/${game.id}/lineup`, state: summaryState },
    rematch: { to: `/games/${game.id}/rematch`, state: { sourceGame: toSummary(game) } },
  }[task.action]
  const showLineupButton = game.status === 'RECRUITING' && task.key !== 'lineup'
  const locked = lineupLocked(info)

  return (
    <section className={`${styles.card} ${className}`} aria-labelledby="host-menu-title">
      <h2 id="host-menu-title" className={styles.cardTitle}>
        파티장 메뉴
      </h2>

      <div className={styles.task}>
        <p className={styles.taskEyebrow}>다음 할 일</p>
        <p className={styles.taskTitle}>{task.title}</p>
        <p className={styles.taskText}>{task.text}</p>
        {actionTarget && (
          <Button as={Link} to={actionTarget.to} state={actionTarget.state}>
            {task.label}
            <ArrowRightIcon size={18} />
          </Button>
        )}
      </div>

      {showLineupButton && (
        <div className={styles.lineupRow}>
          {locked ? (
            <Button variant="secondary" disabled aria-describedby="lineup-lock-hint">
              <SwapIcon size={18} />팀 짜기
            </Button>
          ) : (
            <Button as={Link} to={`/games/${game.id}/lineup`} state={summaryState} variant="secondary">
              <SwapIcon size={18} />팀 짜기
            </Button>
          )}
          {locked && (
            <p id="lineup-lock-hint" className={styles.lockHint}>
              실력을 모두 입력하면 열려요.
            </p>
          )}
        </div>
      )}

      <hr className={styles.divider} />
      <div className={styles.twoButtons}>
        <Button as={Link} to={`/games/${game.id}/notices/new`} state={summaryState} variant="secondary">
          <MegaphoneIcon size={18} />공지 작성
        </Button>
        <Button
          as={Link}
          to={`/games/${game.id}/polls/new`}
          state={{ gameTitle: game.title }}
          variant="secondary"
        >
          <BarChartIcon size={18} />투표 만들기
        </Button>
      </div>
      {/* 선수 관리(⑧)가 실력·포지션을 합칠 때까지 포지션 설정 화면으로 가는 길을 임시로 둔다 */}
      {game.status === 'RECRUITING' && (
        <Link className={styles.textLink} to={`/games/${game.id}/positions`}>
          선수 포지션 설정
        </Link>
      )}

      {canDeleteGame(game) && (
        <>
          <hr className={styles.divider} />
          <DeleteGameSection gameId={game.id} />
        </>
      )}
    </section>
  )
}

// 경기 삭제(DELETE /games/{gameId}, BE D-33). 되돌릴 수 없으므로 한 번 더 확인받는다.
// 버튼이 확인 영역으로 바뀌면 눌렀던 버튼이 사라지므로, 키보드 포커스를 "취소"로 옮기고
// 취소하면 다시 "경기 삭제"로 돌려준다. 처음 화면을 열 때는 포커스를 가져가지 않는다.
function DeleteGameSection({ gameId }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      await deleteGame(gameId)
      navigate('/', { replace: true, state: { notice: 'game-deleted' } })
    } catch (deleteError) {
      setError(deleteErrorMessage(deleteError))
      setDeleting(false)
    }
  }

  if (!confirming) {
    return (
      <div className={styles.danger}>
        <button
          type="button"
          className={styles.deleteTrigger}
          onClick={() => setConfirming(true)}
          autoFocus={cancelled}
        >
          <TrashIcon size={18} />경기 삭제
        </button>
        <p className={styles.dangerHint}>
          종료 전까지만 삭제할 수 있어요. 삭제한 경기는 목록에서 사라져요.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.danger} role="group" aria-labelledby="delete-title">
      <p id="delete-title" className={styles.dangerTitle}>
        이 경기를 삭제할까요?
      </p>
      <p className={styles.dangerHint}>
        삭제하면 참가 선수와 공지를 포함해 경기를 볼 수 없고, 되돌릴 수 없어요.
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className={styles.twoButtons}>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(false)
            setCancelled(true)
            setError(null)
          }}
          disabled={deleting}
          autoFocus
        >
          취소
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? '삭제하는 중…' : '삭제'}
        </Button>
      </div>
    </div>
  )
}
