import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getGame } from '../api/games.js'
import { createPoll } from '../api/polls.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { Field } from '../components/Field.jsx'
import { ArrowLeftIcon, InfoIcon, LockIcon, PinIcon, PlusIcon, XIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { Switch } from '../components/Switch.jsx'
import { parseGameId } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import {
  OPTION_MAX,
  OPTIONS_MAX,
  OPTIONS_MIN,
  TITLE_MAX,
  pollErrorMessage,
  toCreatePollBody,
  validatePollForm,
} from './polls.js'
import styles from './PollCreatePage.module.css'

const LOAD_FAILED = '경기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

// 투표 만들기(/games/:gameId/polls/new, POST /games/{gameId}/polls, BE D-34, 시안 PollNew). 파티장만 쓸 수 있다.
// 권한은 노출만 조절하고 최종 판단은 BE 응답(GAME_403_1)을 따른다. 만들면 새 투표가 열린 투표 탭으로 보낸다.
export function PollCreatePage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [gameResult, setGameResult] = useState(null) // { key: gameId, game } | { key: gameId, error }
  const [title, setTitle] = useState('')
  // 선택지 행마다 고정 key를 둬서 중간 행을 지워도 입력이 섞이지 않게 한다
  const [options, setOptions] = useState([{ key: 0, value: '' }, { key: 1, value: '' }])
  const nextKey = useRef(2)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState(null) // { field, message }
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const current = gameResult?.key === gameId ? gameResult : null

  useEffect(() => {
    if (gameId === null) return
    let active = true
    getGame(gameId)
      .then((game) => {
        if (active) setGameResult({ key: gameId, game })
      })
      .catch((requestError) => {
        if (!active) return
        if (requestError.code === 'MEMBER_404_1') {
          navigate('/login', { replace: true, state: { error: 'member_not_found' } })
          startTransition(() => clearSession())
          return
        }
        setGameResult({ key: gameId, error: requestError })
      })
    return () => {
      active = false
    }
  }, [gameId, navigate, clearSession])

  function changeOption(key, value) {
    setOptions((previous) => previous.map((option) => (option.key === key ? { ...option, value } : option)))
    setError(null)
  }

  function addOption() {
    setOptions((previous) => [...previous, { key: nextKey.current, value: '' }])
    nextKey.current += 1
  }

  function removeOption(key) {
    setOptions((previous) => previous.filter((option) => option.key !== key))
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = { title, options: options.map((option) => option.value), allowMultiple, date, time }
    const invalid = validatePollForm(form)
    if (invalid) {
      setError(invalid)
      return
    }

    pending.current = true
    setSubmitting(true)
    setError(null)
    try {
      const poll = await createPoll(gameId, toCreatePollBody(form))
      navigate(`/games/${gameId}/polls/${poll.id}`, { replace: true, state: { created: true } })
    } catch (requestError) {
      if (requestError?.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      let field = null
      if (requestError?.code === 'POLL_400_2') field = 'deadline'
      else if (requestError?.code === 'POLL_400_1') field = 'options'
      setError({ field, message: pollErrorMessage(requestError, '투표를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.') })
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  const game = current?.game ?? null
  const backTo = `/games/${gameId}/polls`
  const optionError = error?.field === 'options' ? error.message : undefined

  let body
  if (gameId === null || current?.error?.code === 'GAME_404_1') {
    body = (
      <StateCard
        icon={<PinIcon size={22} />}
        title={gameId === null ? '경기 주소가 올바르지 않아요' : '경기를 찾을 수 없어요'}
        actions={
          <Button as={Link} to="/" variant="secondary" fit="auto">
            경기 목록으로
          </Button>
        }
      >
        {gameId === null ? '경기 목록에서 다시 선택해 주세요.' : '삭제됐거나 없는 경기예요.'}
      </StateCard>
    )
  } else if (!current) {
    body = (
      <p className={styles.message} role="status">
        경기를 불러오는 중…
      </p>
    )
  } else if (current.error) {
    body = (
      <div className={styles.message}>
        <ErrorMessage>{pollErrorMessage(current.error, LOAD_FAILED)}</ErrorMessage>
        <Button as={Link} to={backTo} variant="secondary" fit="auto">
          투표 탭으로
        </Button>
      </div>
    )
  } else if (!game.isHost) {
    body = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="파티장만 투표를 만들 수 있어요"
        actions={
          <Button as={Link} to={backTo} variant="secondary" fit="auto">
            투표 보기
          </Button>
        }
      >
        투표는 이 경기의 파티장만 만들 수 있어요. 참가자는 투표 탭에서 투표에 참여할 수 있어요.
      </StateCard>
    )
  } else {
    body = (
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <section className={styles.card}>
          <Field
            label="투표 제목"
            aside={`${title.length} / ${TITLE_MAX}`}
            name="title"
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="예: 뒤풀이 갈 사람?"
            autoComplete="off"
            error={error?.field === 'title' ? error.message : undefined}
            onChange={(event) => {
              setTitle(event.target.value)
              setError(null)
            }}
          />

          <div className={styles.group} role="group" aria-labelledby="poll-options-label">
            <div className={styles.legendRow}>
              <span id="poll-options-label" className={styles.legend}>
                선택지
              </span>
              <span className={styles.aside}>
                {options.length} / {OPTIONS_MAX}
              </span>
            </div>
            {options.map((option, index) => (
              <div key={option.key} className={styles.optionRow}>
                <input
                  className={styles.optionInput}
                  type="text"
                  value={option.value}
                  maxLength={OPTION_MAX}
                  placeholder={`선택지 ${index + 1}`}
                  aria-label={`선택지 ${index + 1}`}
                  autoComplete="off"
                  aria-invalid={error?.field === 'options' && !option.value.trim() ? 'true' : undefined}
                  onChange={(event) => changeOption(option.key, event.target.value)}
                />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`선택지 ${index + 1} 지우기`}
                  disabled={options.length <= OPTIONS_MIN}
                  onClick={() => removeOption(option.key)}
                >
                  <XIcon size={18} />
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              fit="auto"
              className={styles.add}
              onClick={addOption}
              disabled={options.length >= OPTIONS_MAX}
            >
              <PlusIcon size={18} />
              선택지 추가
            </Button>
            {optionError ? (
              <p className={styles.error} role="alert">
                {optionError}
              </p>
            ) : (
              <p className={styles.hint}>
                {OPTIONS_MIN}~{OPTIONS_MAX}개, 서로 다른 내용이어야 해요.
              </p>
            )}
          </div>

          <div className={styles.switchRow}>
            <div className={styles.switchText}>
              <span className={styles.switchTitle}>여러 개 선택 허용</span>
              <span className={styles.hint}>끄면 한 사람이 하나만 고를 수 있어요.</span>
            </div>
            <Switch label="여러 개 선택 허용" checked={allowMultiple} onChange={setAllowMultiple} />
          </div>

          <div className={styles.group}>
            <div className={styles.dateRow}>
              <Field
                className={styles.dateField}
                label={
                  <>
                    마감 날짜 <span className={styles.optional}>선택</span>
                  </>
                }
                type="date"
                name="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setError(null)
                }}
              />
              <Field
                className={styles.timeField}
                label={
                  <>
                    마감 시간 <span className={styles.optional}>선택</span>
                  </>
                }
                type="time"
                name="time"
                value={time}
                onChange={(event) => {
                  setTime(event.target.value)
                  setError(null)
                }}
              />
            </div>
            {error?.field === 'deadline' ? (
              <p className={styles.error} role="alert">
                {error.message}
              </p>
            ) : (
              <p className={styles.hint}>비워 두면 마감 없이 계속 받아요. 넣는다면 지금보다 뒤여야 해요.</p>
            )}
          </div>

          <p className={styles.info}>
            <InfoIcon size={18} />
            <span>
              파티장과 참가자만 투표할 수 있고, 누가 무엇을 골랐는지 닉네임으로 보여요. 만든 투표는 수정·삭제·조기 마감할 수 없어요.
            </span>
          </p>
          {!error?.field && <ErrorMessage>{error?.message}</ErrorMessage>}
        </section>

        <div className={styles.actions}>
          <Button as={Link} to={backTo} variant="subtle" fit="auto" className={styles.cancel}>
            취소
          </Button>
          <Button type="submit" size="lg" fit="responsive" disabled={submitting}>
            {submitting ? '만드는 중…' : '투표 만들기'}
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
          {game?.title ?? '투표'}
        </Link>
      )}
      <header className={styles.header}>
        {game && (
          <p className={styles.eyebrow}>
            {game.title} · {dateTimeLabel(game.playDate)}
          </p>
        )}
        <h1 className={styles.title}>투표 만들기</h1>
        <p className={styles.lead}>뒤풀이, 조끼 색, 다음 일정처럼 의견을 모을 때 써요.</p>
      </header>
      {body}
    </main>
  )
}
