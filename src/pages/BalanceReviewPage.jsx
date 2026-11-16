import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { createBalanceReview } from '../api/balanceReviews.js'
import { ApiError } from '../api/client.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import {
  BALANCE_REASONS,
  MAX_COMMENT_LENGTH,
  MAX_SCORE,
  MIN_SCORE,
  isValidScore,
  toggleReason,
  toReviewRequest,
} from './balanceReview.js'
import { parseGameId } from './gameDetail.js'
import styles from './BalanceReviewPage.module.css'

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index)

// 다시 제출해도 결과가 같은 거절이라 폼 대신 안내만 보여준다.
const BLOCKED_MESSAGES = {
  BALANCE_409_2: {
    title: '이미 밸런스를 평가했어요',
    text: '한 경기에서 한 번만 평가할 수 있어요.',
  },
  BALANCE_409_1: {
    title: '아직 평가할 수 없는 경기예요',
    text: '경기가 끝난 뒤에 밸런스를 평가할 수 있어요.',
  },
  BALANCE_403_1: {
    title: '참가한 경기만 평가할 수 있어요',
    text: '이 경기에 참가한 회원만 밸런스를 평가할 수 있어요.',
  },
  GAME_404_1: {
    title: '경기를 찾을 수 없어요',
    text: '삭제되었거나 없는 경기예요.',
  },
}

function submitErrorMessage(error) {
  if (!(error instanceof ApiError)) return '평가를 제출하지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GLOBAL_400_1' || error.code === 'BALANCE_400_1') return '입력한 내용을 확인해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 평가할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '평가를 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 경기 이후 밸런스 작성(POST /games/{gameId}/balance-reviews, BE D-28)
export function BalanceReviewPage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const navigate = useNavigate()
  const game = location.state?.game?.id === gameId ? location.state.game : null
  const [score, setScore] = useState(null)
  const [reasons, setReasons] = useState([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return

    if (!isValidScore(score)) {
      setError('점수를 골라 주세요.')
      return
    }
    const body = toReviewRequest({ score, reasons, comment })
    if ((body.comment ?? '').length > MAX_COMMENT_LENGTH) {
      setError(`의견은 ${MAX_COMMENT_LENGTH}자 이하로 입력해 주세요.`)
      return
    }

    pending.current = true
    setSubmitting(true)
    setError('')
    try {
      await createBalanceReview(gameId, body)
      navigate(`/games/${gameId}`, { replace: true, state: { notice: 'balance-reviewed' } })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        return
      }
      const blockedMessage = requestError instanceof ApiError && BLOCKED_MESSAGES[requestError.code]
      if (blockedMessage) {
        setBlocked(blockedMessage)
      } else {
        setError(submitErrorMessage(requestError))
      }
      pending.current = false
      setSubmitting(false)
    }
  }

  if (gameId === null) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.messageCard}>
          <h1>경기 정보를 확인할 수 없어요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.secondaryLink} to="/games">경기 목록으로</Link>
        </section>
      </PageLayout>
    )
  }

  if (blocked) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
        <section className={styles.messageCard} role="status">
          <h1>{blocked.title}</h1>
          <p>{blocked.text}</p>
          <Link className={styles.secondaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{game?.title ? `경기 후기 · ${game.title}` : `경기 후기 · 경기 #${gameId}`}</p>
        <h1>밸런스 평가</h1>
        <p className={styles.intro}>오늘 경기의 팀 밸런스는 어땠나요? 한 번만 제출할 수 있어요.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.fieldset}>
          <legend>밸런스 점수 <span aria-hidden="true">*</span></legend>
          <div className={styles.scores}>
            {SCORES.map((value) => (
              <label key={value} className={styles.scoreOption}>
                <input
                  type="radio"
                  name="score"
                  value={value}
                  checked={score === value}
                  onChange={() => {
                    setScore(value)
                    setError('')
                  }}
                  disabled={submitting}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>
            이유 <span className={styles.optional}>(선택, 여러 개 고를 수 있어요)</span>
          </legend>
          <div className={styles.reasons}>
            {BALANCE_REASONS.map((reason) => (
              <label key={reason.value} className={styles.reasonOption}>
                <input
                  type="checkbox"
                  name="reasons"
                  value={reason.value}
                  checked={reasons.includes(reason.value)}
                  onChange={() => setReasons((current) => toggleReason(current, reason.value))}
                  disabled={submitting}
                />
                <span>{reason.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="balance-comment">
            한 줄 의견 <span className={styles.optional}>(선택)</span>
          </label>
          <textarea
            id="balance-comment"
            name="comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value)
              setError('')
            }}
            rows={4}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="팀 구성에 대해 하고 싶은 말을 남겨 주세요"
            aria-describedby="balance-comment-hint"
            disabled={submitting}
          />
          <p id="balance-comment-hint" className={styles.hint}>
            {comment.length}/{MAX_COMMENT_LENGTH}자
          </p>
        </div>

        <ErrorMessage>{error}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '제출하는 중…' : '평가 제출'}
        </Button>
      </form>
    </PageLayout>
  )
}
