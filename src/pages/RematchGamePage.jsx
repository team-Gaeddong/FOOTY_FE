import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { rematchGame } from '../api/games.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './RematchGamePage.module.css'

function currentKoreanMinute() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function displayDateTime(value) {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return value
  return `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`
}

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '재경기를 만들지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GAME_403_1') return '원본 경기의 파티장만 재경기를 만들 수 있어요.'
  if (error.code === 'GAME_404_1') return '원본 경기가 없거나 삭제됐어요. 목록에서 다시 확인해 주세요.'
  if (error.code === 'GAME_409_2') return '종료된 경기만 재경기로 만들 수 있어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 재경기를 만들 수 있어요.'
  if (error.code === 'GLOBAL_400_1') return '새 경기 일시를 확인해 주세요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '재경기를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function RematchGamePage() {
  const { gameId } = useParams()
  const location = useLocation()
  const numericId = Number(gameId)
  const validId = /^\d+$/.test(gameId ?? '') && Number.isSafeInteger(numericId) && numericId > 0
  const sourceGame = location.state?.sourceGame?.id === numericId ? location.state.sourceGame : null
  const [playDate, setPlayDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdGame, setCreatedGame] = useState(null)
  const pending = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current || !validId) return

    setDateError('')
    setSubmitError('')
    if (!playDate) {
      setDateError('새 경기 일시를 선택해 주세요.')
      return
    }
    if (playDate <= currentKoreanMinute()) {
      setDateError('현재보다 늦은 한국시간을 선택해 주세요.')
      return
    }

    pending.current = true
    setSubmitting(true)
    try {
      const game = await rematchGame(numericId, `${playDate}:00`)
      setCreatedGame(game)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'GAME_400_3') {
        setDateError('현재보다 늦은 한국시간을 선택해 주세요.')
      } else {
        setSubmitError(errorMessage(error))
      }
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (!validId) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.panel}>
          <h1>경기 주소가 올바르지 않아요</h1>
          <p>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.primaryLink} to="/games">경기 목록 보기</Link>
        </section>
      </PageLayout>
    )
  }

  if (createdGame) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to="/games">← 경기 목록</Link>
        <section className={styles.panel} aria-labelledby="rematch-success-title">
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <p className={styles.eyebrow}>재경기 생성 완료</p>
          <h1 id="rematch-success-title">새 경기를 만들었어요!</h1>
          <p>기존 경기의 설정으로 다시 모일 수 있어요.</p>
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
          <Link className={styles.primaryLink} to="/games">경기 목록으로 돌아가기</Link>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to="/games">← 경기 목록</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>한 번 더 함께 뛰어요</p>
        <h1>재경기 만들기</h1>
        <p>원본 경기의 설정을 사용하고 새 경기 일시만 정해 주세요.</p>
      </header>

      <section className={styles.panel} aria-labelledby="source-game-title">
        <span className={styles.badge}>원본 경기</span>
        <h2 id="source-game-title">{sourceGame?.title ?? `경기 #${numericId}`}</h2>
        {sourceGame ? (
          <dl>
            <div><dt>기존 일시</dt><dd>{displayDateTime(sourceGame.playDate)}</dd></div>
            <div><dt>장소</dt><dd>{sourceGame.location}</dd></div>
            <div><dt>참가 정원</dt><dd>{sourceGame.maxPlayers}명</dd></div>
            <div><dt>팀 수</dt><dd>{sourceGame.teamCount}팀</dd></div>
          </dl>
        ) : (
          <p>경기 설정은 서버에서 확인해 새 경기에 복사합니다.</p>
        )}
        <p className={styles.note}>참가 선수 목록은 복사되지 않아요.</p>
      </section>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="rematch-play-date">새 경기 일시 <span aria-hidden="true">*</span></label>
          <input
            id="rematch-play-date"
            type="datetime-local"
            value={playDate}
            min={currentKoreanMinute()}
            onChange={(event) => {
              setPlayDate(event.target.value)
              setDateError('')
              setSubmitError('')
            }}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? 'rematch-date-error' : 'rematch-date-hint'}
          />
          {dateError && <p id="rematch-date-error" className={styles.fieldError}>{dateError}</p>}
          <p id="rematch-date-hint" className={styles.hint}>한국시간 기준, 현재보다 늦은 일시를 선택해 주세요.</p>
        </div>
        <ErrorMessage>{submitError}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '재경기 만드는 중…' : '재경기 만들기'}
        </Button>
      </form>
    </PageLayout>
  )
}
