import { startTransition, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { createGame } from '../api/games.js'
import { useAuth } from '../auth/useAuth.js'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { Field } from '../components/Field.jsx'
import { ArrowLeftIcon, CheckIcon } from '../components/Icons.jsx'
import { Stepper } from '../components/Stepper.jsx'
import {
  INITIAL_FORM,
  LOCATION_MAX,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MIN_TEAMS,
  TEAM_COUNT_HINT,
  TITLE_MAX,
  maxPlayersHint,
  previewOf,
  setMaxPlayers,
  setTeamCount,
  submitErrorOf,
  toCreateRequest,
  validate,
} from './createGameForm.js'
import { dateTimeLabel } from './homeCalendar.js'
import styles from './CreateGamePage.module.css'

const PREVIEW_NOTES = [
  '만들면 파티장으로 자동 참가해요.',
  '내 선호 포지션이 이 경기 포지션으로 들어가요.',
  '모집 중 상태로 바로 목록에 올라가요.',
]

export function CreateGamePage() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdGame, setCreatedGame] = useState(null)
  const pending = useRef(false)
  const preview = previewOf(form)

  // 값을 바꾸면 그 칸의 오류를 지운다. 최대 인원을 바꾸면 팀 수도 영향을 받으므로 둘의 오류를 함께 지운다.
  function change(next, ...names) {
    setForm(next)
    setFieldErrors((current) => {
      const cleared = { ...current }
      for (const name of names) cleared[name] = undefined
      return cleared
    })
    setSubmitError('')
  }

  function updateField(event) {
    const { name, value } = event.target
    change({ ...form, [name]: value }, name)
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
      setCreatedGame(await createGame(toCreateRequest(form)))
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        // 탈퇴했거나 없는 회원이다(BE D-16). 이동과 같은 transition에서 지워야 안내(state)가 남는다.
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      const { field, message } = submitErrorOf(error)
      if (field) setFieldErrors((current) => ({ ...current, [field]: message }))
      else setSubmitError(message)
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (createdGame) {
    return (
      <main className={styles.page}>
        <section className={styles.success} aria-labelledby="success-title">
          <span className={styles.successIcon} aria-hidden="true">
            <CheckIcon size={24} />
          </span>
          <div className={styles.successText}>
            <p className={styles.eyebrow}>경기 생성 완료</p>
            <h1 id="success-title" className={styles.title}>
              경기를 만들었어요!
            </h1>
            <p className={styles.lead}>
              친구들과 함께 뛸 준비가 됐어요. 파티장은 참가 선수로 자동 등록됐어요.
            </p>
          </div>
          <div className={styles.summary}>
            <Badge tone="green">모집 중</Badge>
            <h2 className={styles.summaryTitle}>{createdGame.title}</h2>
            <dl className={styles.summaryList}>
              <div><dt>경기 일시</dt><dd>{dateTimeLabel(createdGame.playDate)}</dd></div>
              <div><dt>장소</dt><dd>{createdGame.location}</dd></div>
              <div><dt>최대 인원</dt><dd>{createdGame.maxPlayers}명</dd></div>
              <div><dt>팀 수</dt><dd>{createdGame.teamCount}팀</dd></div>
            </dl>
          </div>
          <div className={styles.successActions}>
            <Button as={Link} to={`/games/${createdGame.id}`} size="lg">
              만든 경기 보기
            </Button>
            <Button as={Link} to="/" variant="secondary" size="lg">
              홈으로 돌아가기
            </Button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Link className={styles.back} to="/">
        <ArrowLeftIcon size={18} />
        경기 목록
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>경기 만들기</h1>
        <p className={styles.lead}>날짜와 장소, 인원을 정하면 바로 모집을 시작해요.</p>
      </header>

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <section className={styles.card} aria-label="경기 정보">
          <Field
            label="경기 제목"
            aside={`${form.title.length} / ${TITLE_MAX}`}
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength={TITLE_MAX}
            placeholder="예: 토요일 오후 풋살"
            autoComplete="off"
            error={fieldErrors.title}
          />

          <div className={styles.dateRow}>
            <Field
              className={styles.dateField}
              label="날짜"
              type="date"
              name="date"
              value={form.date}
              onChange={updateField}
              error={fieldErrors.date}
            />
            <Field
              className={styles.timeField}
              label="시작 시간"
              type="time"
              name="time"
              value={form.time}
              onChange={updateField}
              error={fieldErrors.time}
            />
          </div>
          <p className={styles.note}>지금보다 뒤의 일시만 고를 수 있어요.</p>

          <Field
            label="장소"
            aside={`${form.location.length} / ${LOCATION_MAX}`}
            name="location"
            value={form.location}
            onChange={updateField}
            maxLength={LOCATION_MAX}
            placeholder="예: 서울 월드컵 풋살장"
            autoComplete="off"
            error={fieldErrors.location}
          />

          <div className={styles.steppers}>
            <Stepper
              label="최대 인원"
              value={form.maxPlayers}
              unit="명"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              onChange={(value) => change(setMaxPlayers(form, value), 'maxPlayers', 'teamCount')}
              hint={maxPlayersHint(form.maxPlayers)}
              decreaseLabel="최대 인원 줄이기"
              increaseLabel="최대 인원 늘리기"
              disabled={submitting}
            />
            <Stepper
              label="팀 수"
              value={form.teamCount}
              unit="팀"
              min={MIN_TEAMS}
              max={form.maxPlayers}
              onChange={(value) => change(setTeamCount(form, value), 'teamCount')}
              hint={TEAM_COUNT_HINT}
              decreaseLabel="팀 수 줄이기"
              increaseLabel="팀 수 늘리기"
              disabled={submitting}
            />
          </div>
          <ErrorMessage>{fieldErrors.maxPlayers ?? fieldErrors.teamCount}</ErrorMessage>
        </section>

        <aside className={styles.preview} aria-labelledby="preview-title">
          <h2 id="preview-title" className={styles.previewTitle}>
            목록에 이렇게 보여요
          </h2>
          <div className={styles.previewCard}>
            <div className={styles.previewTop}>
              <span className={styles.previewTime}>{preview.time}</span>
              <Badge tone="green" className={styles.previewBadge}>
                모집 중
              </Badge>
            </div>
            <div className={styles.previewInfo}>
              <p className={preview.titleFilled ? styles.previewGame : styles.previewPlaceholder}>
                {preview.title}
              </p>
              <p className={styles.previewSub}>{preview.sub}</p>
            </div>
          </div>
          <p
            className={[
              styles.previewDate,
              preview.dateFilled ? styles[preview.tone] : styles.previewPlaceholder,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {preview.dateText}
          </p>
          <hr className={styles.divider} />
          <ul className={styles.notes}>
            {PREVIEW_NOTES.map((note) => (
              <li key={note}>
                <CheckIcon size={16} />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.actions}>
          <ErrorMessage>{submitError}</ErrorMessage>
          <div className={styles.buttons}>
            <Button as={Link} to="/" variant="secondary" fit="auto" className={styles.cancel}>
              취소
            </Button>
            <Button type="submit" size="lg" fit="responsive" disabled={submitting}>
              {submitting ? '경기 만드는 중…' : '경기 만들기'}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}
