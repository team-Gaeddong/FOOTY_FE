import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { createPoll } from '../api/polls.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
import {
  OPTION_MAX,
  OPTIONS_MAX,
  OPTIONS_MIN,
  TITLE_MAX,
  pollErrorMessage,
  toCreatePollBody,
  validatePollForm,
} from './polls.js'
import styles from './PollPage.module.css'

// 파티장이 의견 투표를 만든다(POST /games/{gameId}/polls, BE D-34). 권한은 BE 응답(GAME_403_1)으로 판단한다.
export function PollCreatePage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const navigate = useNavigate()
  const gameTitle = location.state?.gameTitle
  const [title, setTitle] = useState('')
  // 선택지 행마다 고정 key를 둬서 중간 행을 지워도 입력이 섞이지 않게 한다
  const [options, setOptions] = useState([{ key: 0, value: '' }, { key: 1, value: '' }])
  const nextKey = useRef(2)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState(null) // { field, message }
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)

  function changeOption(key, value) {
    setOptions((current) => current.map((option) => (option.key === key ? { ...option, value } : option)))
    setError(null)
  }

  function addOption() {
    setOptions((current) => [...current, { key: nextKey.current, value: '' }])
    nextKey.current += 1
  }

  function removeOption(key) {
    setOptions((current) => current.filter((option) => option.key !== key))
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = { title, options: options.map((option) => option.value), allowMultiple, deadline }
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
      navigate(`/games/${gameId}/polls/${poll.id}`, {
        replace: true,
        state: { gameTitle, isHost: true, created: true },
      })
    } catch (requestError) {
      setError({
        field: requestError?.code === 'POLL_400_2' ? 'deadline' : null,
        message: pollErrorMessage(requestError, '투표를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'),
      })
      pending.current = false
      setSubmitting(false)
    }
  }

  if (gameId === null) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.panel}>
          <h1>경기 정보를 확인할 수 없어요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.secondaryLink} to="/games">경기 목록으로</Link>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}/polls`} state={{ gameTitle, isHost: true }}>
        ← 투표 목록
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>파티장 메뉴{gameTitle ? ` · ${gameTitle}` : ` · 경기 #${gameId}`}</p>
        <h1>투표 만들기</h1>
        <p className={styles.intro}>경기 참가자에게 물어볼 것과 선택지를 적어 주세요.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="poll-title">제목</label>
          <input
            id="poll-title"
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="예: 뒤풀이 장소를 골라 주세요"
            autoComplete="off"
            onChange={(event) => {
              setTitle(event.target.value)
              setError(null)
            }}
            aria-invalid={error?.field === 'title'}
          />
          <p className={styles.hint}>{title.length}/{TITLE_MAX}자</p>
        </div>

        <fieldset className={styles.field}>
          <legend className={styles.legend}>선택지 ({OPTIONS_MIN}~{OPTIONS_MAX}개)</legend>
          {options.map((option, index) => (
            <div key={option.key} className={styles.optionRow}>
              <input
                type="text"
                value={option.value}
                maxLength={OPTION_MAX}
                placeholder={`선택지 ${index + 1}`}
                aria-label={`선택지 ${index + 1}`}
                autoComplete="off"
                onChange={(event) => changeOption(option.key, event.target.value)}
                aria-invalid={error?.field === 'options' && !option.value.trim()}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeOption(option.key)}
                disabled={options.length <= OPTIONS_MIN}
                aria-label={`선택지 ${index + 1} 삭제`}
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addButton}
            onClick={addOption}
            disabled={options.length >= OPTIONS_MAX}
          >
            + 선택지 추가
          </button>
        </fieldset>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(event) => setAllowMultiple(event.target.checked)}
          />
          여러 개 고를 수 있게 하기
        </label>

        <div className={styles.field}>
          <label htmlFor="poll-deadline">마감 일시 (선택)</label>
          <input
            id="poll-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(event) => {
              setDeadline(event.target.value)
              setError(null)
            }}
            aria-invalid={error?.field === 'deadline'}
          />
          <p className={styles.hint}>비워 두면 마감 없이 언제든 바꿀 수 있어요.</p>
        </div>

        <ErrorMessage>{error?.message}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '만드는 중…' : '투표 만들기'}
        </Button>
      </form>
    </PageLayout>
  )
}
