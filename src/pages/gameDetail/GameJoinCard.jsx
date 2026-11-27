import { startTransition, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../api/client.js'
import { getGame, joinGame } from '../../api/games.js'
import { useAuth } from '../../auth/useAuth.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { InfoIcon, LockIcon } from '../../components/Icons.jsx'
import { PositionPicker } from '../../components/PositionPicker.jsx'
import { isValidPositions } from '../../components/positions.js'
import styles from './GameOverview.module.css'

function joinErrorMessage(error) {
  if (!(error instanceof ApiError)) return '참가하지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'MEMBER_400_2' || error.code === 'GLOBAL_400_1') return '포지션을 1~4개 골라 주세요.'
  if (error.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제된 경기일 수 있어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 참가할 수 있어요.'
  return '참가하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

const PREFILLED_HINT =
  '내 선호 포지션을 불러왔어요. 누른 순서가 우선순위이고, 이 경기에서만 다르게 고를 수 있어요.'
const DEFAULT_HINT = '누른 순서가 우선순위예요. 1~4개를 골라 주세요.'

// 참가 신청(POST /games/{gameId}/players). 내 선호 포지션(preferred)으로 미리 채우고 이 경기에서만 바꿀 수 있다.
// 참가에 성공하거나 이미 참가했으면(GAME_409_3)·모집이 끝났으면(GAME_409_1) 최신 경기를 다시 받아 화면을 맞춘다.
export function GameJoinCard({ gameId, preferred, onUpdated, className = '' }) {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  // null이면 아직 고르지 않은 상태라 선호 포지션을 보여준다.
  const [picked, setPicked] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const positions = picked ?? preferred
  const prefilled = picked === null && preferred.length > 0

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!isValidPositions(positions)) {
      setError('포지션을 1~4개 골라 주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await joinGame(gameId, positions)
    } catch (joinError) {
      if (joinError instanceof ApiError && joinError.code === 'MEMBER_404_1') {
        // 탈퇴했거나 없는 회원이다(BE D-16). 이동과 같은 transition에서 지워야 안내(state)가 남는다.
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const stale =
        joinError instanceof ApiError &&
        (joinError.code === 'GAME_409_3' || joinError.code === 'GAME_409_1')
      if (!stale) {
        setError(joinErrorMessage(joinError))
        setSubmitting(false)
        return
      }
    }
    try {
      onUpdated(await getGame(gameId))
    } catch {
      setError('참가 결과를 확인하지 못했어요. 새로고침해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <form
      className={`${styles.card} ${className}`}
      aria-labelledby="join-title"
      onSubmit={handleSubmit}
      noValidate
    >
      <h2 id="join-title" className={styles.cardTitle}>
        참가 신청
      </h2>
      <PositionPicker
        legend="희망 포지션"
        value={positions}
        onChange={(next) => {
          setPicked(next)
          setError(null)
        }}
        hint={prefilled ? PREFILLED_HINT : DEFAULT_HINT}
        columns={2}
        showOrder={false}
        invalid={error !== null && !isValidPositions(positions)}
        disabled={submitting}
      />
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? '참가하는 중…' : '참가하기'}
      </Button>
      <hr className={styles.divider} />
      <ul className={styles.notes}>
        <li>
          <InfoIcon size={16} />
          <span>실력은 파티장이 매기고 파티장에게만 보여요.</span>
        </li>
        <li>
          <LockIcon size={16} />
          <span>공지와 투표는 참가한 뒤에 볼 수 있어요.</span>
        </li>
      </ul>
    </form>
  )
}
