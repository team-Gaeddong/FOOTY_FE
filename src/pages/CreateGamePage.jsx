import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { createGame } from '../api/games.js'
import { ApiError } from '../api/client.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './CreateGamePage.module.css'

const INITIAL_FORM = {
  title: '',
  playDate: '',
  location: '',
  maxPlayers: '',
}

function validate(form) {
  const errors = {}
  const title = form.title.trim()
  const location = form.location.trim()
  const maxPlayers = Number(form.maxPlayers)

  if (!title) errors.title = '경기 제목을 입력해 주세요.'
  else if (title.length > 100) errors.title = '경기 제목은 100자 이하로 입력해 주세요.'

  if (!form.playDate) errors.playDate = '경기 일시를 선택해 주세요.'

  if (!location) errors.location = '장소를 입력해 주세요.'
  else if (location.length > 200) errors.location = '장소는 200자 이하로 입력해 주세요.'

  if (!form.maxPlayers || !Number.isInteger(maxPlayers) || maxPlayers < 1) {
    errors.maxPlayers = '참가 정원을 1명 이상의 정수로 입력해 주세요.'
  } else if (maxPlayers > 2147483647) {
    errors.maxPlayers = '참가 정원이 너무 큽니다.'
  }

  return errors
}

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '경기를 만들지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GLOBAL_400_1') return '입력값을 확인한 뒤 다시 시도해 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 경기를 만들 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '경기를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function displayDateTime(value) {
  if (!value) return ''
  const [date, time] = value.split('T')
  return `${date.replaceAll('-', '. ')}. ${time.slice(0, 5)}`
}

export function CreateGamePage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdGame, setCreatedGame] = useState(null)
  const pending = useRef(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return

    const errors = validate(form)
    setFieldErrors(errors)
    setSubmitError('')
    if (Object.keys(errors).length > 0) return

    pending.current = true
    setSubmitting(true)
    try {
      const game = await createGame({
        title: form.title.trim(),
        playDate: `${form.playDate}:00`,
        location: form.location.trim(),
        maxPlayers: Number(form.maxPlayers),
      })
      setCreatedGame(game)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (createdGame) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/">← 홈으로</Link>
        <section className={styles.success} aria-labelledby="success-title">
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <p className={styles.eyebrow}>경기 생성 완료</p>
          <h1 id="success-title">경기를 만들었어요!</h1>
          <p className={styles.intro}>친구들과 함께 뛸 준비가 됐어요.</p>
          <div className={styles.summary}>
            <span className={styles.badge}>모집 중</span>
            <h2>{createdGame.title}</h2>
            <dl>
              <div><dt>경기 일시</dt><dd>{displayDateTime(createdGame.playDate)}</dd></div>
              <div><dt>장소</dt><dd>{createdGame.location}</dd></div>
              <div><dt>참가 정원</dt><dd>{createdGame.maxPlayers}명</dd></div>
              <div><dt>팀 수</dt><dd>{createdGame.teamCount}팀</dd></div>
            </dl>
          </div>
          <Link className={styles.primaryLink} to="/">홈으로 돌아가기</Link>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to="/">← 홈으로</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>새 경기</p>
        <h1>경기 만들기</h1>
        <p className={styles.intro}>함께 뛸 경기의 기본 정보를 입력해 주세요.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="game-title">경기 제목 <span aria-hidden="true">*</span></label>
          <input
            id="game-title"
            name="title"
            type="text"
            value={form.title}
            onChange={updateField}
            maxLength={100}
            placeholder="예: 토요일 오후 풋살"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'game-title-error' : undefined}
          />
          {fieldErrors.title && <p id="game-title-error" className={styles.fieldError}>{fieldErrors.title}</p>}
          <p className={styles.hint}>최대 100자</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="game-play-date">경기 일시 <span aria-hidden="true">*</span></label>
          <input
            id="game-play-date"
            name="playDate"
            type="datetime-local"
            value={form.playDate}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.playDate)}
            aria-describedby={fieldErrors.playDate ? 'game-play-date-error' : 'game-play-date-hint'}
          />
          {fieldErrors.playDate && <p id="game-play-date-error" className={styles.fieldError}>{fieldErrors.playDate}</p>}
          <p id="game-play-date-hint" className={styles.hint}>한국시간 기준으로 입력해 주세요.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="game-location">장소 <span aria-hidden="true">*</span></label>
          <input
            id="game-location"
            name="location"
            type="text"
            value={form.location}
            onChange={updateField}
            maxLength={200}
            placeholder="예: 서울 월드컵 풋살장"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.location)}
            aria-describedby={fieldErrors.location ? 'game-location-error' : undefined}
          />
          {fieldErrors.location && <p id="game-location-error" className={styles.fieldError}>{fieldErrors.location}</p>}
          <p className={styles.hint}>최대 200자</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="game-max-players">참가 정원 <span aria-hidden="true">*</span></label>
          <div className={styles.numberInput}>
            <input
              id="game-max-players"
              name="maxPlayers"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.maxPlayers}
              onChange={updateField}
              placeholder="예: 10"
              aria-invalid={Boolean(fieldErrors.maxPlayers)}
              aria-describedby={fieldErrors.maxPlayers ? 'game-max-players-error' : undefined}
            />
            <span aria-hidden="true">명</span>
          </div>
          {fieldErrors.maxPlayers && <p id="game-max-players-error" className={styles.fieldError}>{fieldErrors.maxPlayers}</p>}
        </div>

        <div className={styles.teamCount}>
          <span>팀 수</span>
          <strong>2팀</strong>
          <p>새 경기는 기본 2팀으로 생성돼요.</p>
        </div>

        <ErrorMessage>{submitError}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '경기 만드는 중…' : '경기 만들기'}
        </Button>
      </form>
    </PageLayout>
  )
}
