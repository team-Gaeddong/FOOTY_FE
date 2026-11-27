import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { createBalanceReview } from '../../api/balanceReviews.js'
import { ApiError } from '../../api/client.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { Field } from '../../components/Field.jsx'
import { ArrowLeftIcon, CheckIcon, InfoIcon, LockIcon, PinIcon, ScaleIcon } from '../../components/Icons.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import {
  BALANCE_REASONS,
  MAX_COMMENT_LENGTH,
  MAX_SCORE,
  MIN_SCORE,
  isValidScore,
  toggleReason,
  toReviewRequest,
} from './balanceReview.js'
import { parseGameId } from '../gameDetail/gameDetail.js'
import { dateTimeLabel } from '../home/homeCalendar.js'
import { useGameInfo } from '../gameDetail/useGameInfo.js'
import styles from './BalanceReviewPage.module.css'

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index)

// 다시 제출해도 결과가 같은 거절이라 폼 대신 안내만 보여준다.
const BLOCKED_MESSAGES = {
  BALANCE_409_2: {
    icon: <CheckIcon size={22} />,
    title: '이미 밸런스를 평가했어요',
    text: '한 경기에서 한 번만 평가할 수 있어요.',
  },
  BALANCE_409_1: {
    icon: <ScaleIcon size={22} />,
    title: '아직 평가할 수 없는 경기예요',
    text: '경기가 끝난 뒤에 밸런스를 평가할 수 있어요.',
  },
  BALANCE_403_1: {
    icon: <LockIcon size={22} />,
    title: '참가한 경기만 평가할 수 있어요',
    text: '이 경기에 참가한 회원만 밸런스를 평가할 수 있어요.',
  },
  GAME_404_1: {
    icon: <PinIcon size={22} />,
    title: '경기를 찾을 수 없어요',
    text: '삭제됐거나 없는 경기예요.',
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

// 경기 이후 밸런스 작성(POST /games/{gameId}/balance-reviews, BE D-28). 시안 BalanceReview.
export function BalanceReviewPage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const navigate = useNavigate()
  const game = useGameInfo(gameId, location.state?.game)
  const [score, setScore] = useState(null)
  const [reasons, setReasons] = useState([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const backTo = gameId === null ? '/' : `/games/${gameId}/after`

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
      navigate(backTo, { replace: true, state: { notice: 'balance-reviewed' } })
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

  let body
  if (gameId === null) {
    body = (
      <StateCard
        icon={<PinIcon size={22} />}
        title="경기 주소가 올바르지 않아요"
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        경기 목록에서 다시 선택해 주세요.
      </StateCard>
    )
  } else if (blocked) {
    body = (
      <StateCard
        role="status"
        icon={blocked.icon}
        title={blocked.title}
        actions={
          <Button as={Link} to={backTo} variant="secondary" fit="auto">
            경기 후 탭으로
          </Button>
        }
      >
        {blocked.text}
      </StateCard>
    )
  } else {
    body = (
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <section className={styles.card}>
          <fieldset className={styles.group}>
            <legend className={styles.label}>팀 밸런스 점수</legend>
            <div className={styles.scores}>
              {SCORES.map((value) => (
                <label key={value} className={styles.score}>
                  <input
                    type="radio"
                    name="score"
                    value={value}
                    checked={score === value}
                    aria-label={`${value}점`}
                    onChange={() => {
                      setScore(value)
                      setError('')
                    }}
                    disabled={submitting}
                  />
                  <span aria-hidden="true">{value}</span>
                </label>
              ))}
            </div>
            <div className={styles.scale} aria-hidden="true">
              <span>{MIN_SCORE}점 · 많이 기울었어요</span>
              <span>{MAX_SCORE}점 · 아주 팽팽했어요</span>
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.label}>
              이유 <span className={styles.optional}>선택</span>
            </legend>
            <div className={styles.reasons}>
              {BALANCE_REASONS.map((reason) => (
                <label key={reason.value} className={styles.reason}>
                  <input
                    type="checkbox"
                    name="reasons"
                    value={reason.value}
                    checked={reasons.includes(reason.value)}
                    onChange={() => setReasons((current) => toggleReason(current, reason.value))}
                    disabled={submitting}
                  />
                  <span className={styles.reasonBox}>
                    <span className={styles.check} aria-hidden="true">
                      <CheckIcon size={14} strokeWidth={2.5} />
                    </span>
                    <span>{reason.label}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className={styles.help}>해당하는 것을 모두 골라 주세요.</p>
          </fieldset>

          <Field
            as="textarea"
            className={styles.comment}
            label={
              <>
                의견 <span className={styles.optional}>선택</span>
              </>
            }
            aside={`${comment.length} / ${MAX_COMMENT_LENGTH}`}
            name="comment"
            rows={4}
            value={comment}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="팀 구성에 대해 하고 싶은 말을 남겨 주세요"
            disabled={submitting}
            onChange={(event) => {
              setComment(event.target.value)
              setError('')
            }}
          />

          <p className={styles.info}>
            <InfoIcon size={18} />
            <span>
              한 번 제출하면 고칠 수 없어요. 참가자 전원이 작성하면 점수·이유·의견이 닉네임과 함께 파티장과
              참가자에게 공개돼요.
            </span>
          </p>
          <ErrorMessage>{error}</ErrorMessage>
        </section>

        <div className={styles.actions}>
          <Button as={Link} to={backTo} variant="subtle" fit="auto" className={styles.cancel}>
            취소
          </Button>
          <Button type="submit" size="lg" fit="responsive" disabled={submitting}>
            {submitting ? '제출하는 중…' : '평가 제출'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <main className={styles.page}>
      {gameId !== null && (
        <Link className={styles.back} to={backTo}>
          <ArrowLeftIcon size={18} />
          {game?.title ?? '경기 후'}
        </Link>
      )}
      <header className={styles.header}>
        {game && (
          <p className={styles.eyebrow}>{`${game.title} · ${dateTimeLabel(game.playDate)}`}</p>
        )}
        <h1 className={styles.title}>밸런스 평가</h1>
        <p className={styles.lead}>오늘 경기의 팀 밸런스는 어땠나요?</p>
      </header>
      {body}
    </main>
  )
}
