import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame, rematchGame } from '../api/games.js'
import { formatPlayDate } from './gameDetail.js'
import styles from './RematchGamePage.module.css'

function currentKoreanMinute() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
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

function RematchFrame({ gameId, game, children }) {
  const backPath = gameId ? `/games/${gameId}` : '/games'
  return (
    <div className={styles.screen}>
      <header className={styles.desktopNav}>
        <div className={styles.navInner}>
          <Link className={styles.logo} to="/games">FOOTY</Link>
          <nav className={styles.navLinks} aria-label="주 메뉴"><Link to="/games">경기</Link><Link to="/games/mine">내 경기</Link></nav>
          <div className={styles.navActions}>
            <Link className={styles.createLink} to="/games/new">＋ 경기 만들기</Link>
            <Link className={styles.profileLink} to="/profile"><span>나</span>내 프로필</Link>
          </div>
        </div>
      </header>
      <header className={styles.mobileNav}><Link to={backPath} aria-label="뒤로 가기">←</Link><strong>재경기 만들기</strong></header>
      <main className={styles.main}>
        <Link className={styles.backLink} to={backPath}>← {game?.title ?? '경기 상세'}</Link>
        <div className={styles.pageHeading}>
          {game && <p className={styles.gameLine}>{game.title} · {formatPlayDate(game.playDate)}</p>}
          <h1>재경기 만들기</h1>
          <p>날짜만 새로 정하면 같은 조건의 경기가 열려요.</p>
        </div>
        {children}
      </main>
    </div>
  )
}

export function RematchGamePage() {
  const { gameId } = useParams()
  const location = useLocation()
  const numericId = Number(gameId)
  const validId = /^\d+$/.test(gameId ?? '') && Number.isSafeInteger(numericId) && numericId > 0
  const initialGame = location.state?.sourceGame?.id === numericId ? location.state.sourceGame : null
  const [sourceGame, setSourceGame] = useState(initialGame)
  const [loading, setLoading] = useState(!initialGame)
  const [loadError, setLoadError] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [dateError, setDateError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdGame, setCreatedGame] = useState(null)
  const pending = useRef(false)

  useEffect(() => {
    if (!validId || initialGame) return
    let active = true
    getGame(numericId).then((game) => {
      if (active) setSourceGame(game)
    }).catch((error) => {
      if (active) setLoadError(errorMessage(error))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [validId, numericId, initialGame])

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current || !validId) return
    setDateError('')
    setSubmitError('')
    if (!date || !time) {
      setDateError('새 경기 날짜와 시간을 선택해 주세요.')
      return
    }
    const playDate = `${date}T${time}`
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
    return <RematchFrame><section className={styles.messageCard} role="alert"><h2>경기 주소가 올바르지 않아요</h2><p>경기 목록에서 다시 선택해 주세요.</p><Link className={styles.secondaryLink} to="/games">경기 목록 보기</Link></section></RematchFrame>
  }
  if (loading) {
    return <RematchFrame gameId={numericId}><section className={styles.messageCard} role="status">경기 정보를 불러오는 중…</section></RematchFrame>
  }
  if (loadError) {
    return <RematchFrame gameId={numericId}><section className={styles.messageCard} role="alert"><h2>경기 정보를 불러오지 못했어요</h2><p>{loadError}</p><Link className={styles.secondaryLink} to="/games">경기 목록 보기</Link></section></RematchFrame>
  }
  if (createdGame) {
    return (
      <RematchFrame gameId={numericId} game={sourceGame}>
        <section className={styles.successCard} aria-labelledby="rematch-success-title">
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <p className={styles.eyebrow}>재경기 생성 완료</p>
          <h2 id="rematch-success-title">새 경기를 만들었어요!</h2>
          <p>기존 경기의 설정으로 다시 모일 수 있어요.</p>
          <div className={styles.createdSummary}>
            <span className={styles.badge}>모집 중</span>
            <h3>{createdGame.title}</h3>
            <dl>
              <div><dt>경기 일시</dt><dd>{formatPlayDate(createdGame.playDate)}</dd></div>
              <div><dt>장소</dt><dd>{createdGame.location}</dd></div>
              <div><dt>참가 정원</dt><dd>{createdGame.maxPlayers}명</dd></div>
              <div><dt>팀 수</dt><dd>{createdGame.teamCount}팀</dd></div>
            </dl>
          </div>
          <Link className={styles.primaryLink} to={`/games/${createdGame.id}`}>새 경기 보기</Link>
        </section>
      </RematchFrame>
    )
  }
  return (
    <RematchFrame gameId={numericId} game={sourceGame}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.copyCard}>
          <div className={styles.copyHeading}><h2>그대로 가져오는 정보</h2><span className={styles.badge}>지난 경기에서 복사</span></div>
          <dl className={styles.details}>
            <div><dt>경기 이름</dt><dd>{sourceGame?.title}</dd></div>
            <div><dt>장소</dt><dd>{sourceGame?.location}</dd></div>
            <div><dt>참가 정원</dt><dd>{sourceGame?.maxPlayers}명</dd></div>
            <div><dt>팀 수</dt><dd>{sourceGame?.teamCount}팀</dd></div>
          </dl>
        </div>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="rematch-date">새 경기 날짜 <span aria-hidden="true">*</span></label>
            <input id="rematch-date" type="date" value={date} min={currentKoreanMinute().slice(0, 10)} onChange={(event) => { setDate(event.target.value); setDateError(''); setSubmitError('') }} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? 'rematch-date-error' : 'rematch-date-hint'} />
          </div>
          <div className={styles.field}>
            <label htmlFor="rematch-time">새 경기 시간 <span aria-hidden="true">*</span></label>
            <input id="rematch-time" type="time" value={time} step="60" onChange={(event) => { setTime(event.target.value); setDateError(''); setSubmitError('') }} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? 'rematch-date-error' : 'rematch-date-hint'} />
          </div>
        </div>
        {dateError && <p id="rematch-date-error" className={styles.fieldError} role="alert">{dateError}</p>}
        <p id="rematch-date-hint" className={styles.hint}>지금보다 뒤의 일시만 고를 수 있어요.</p>
        <p className={styles.note}><span aria-hidden="true">ⓘ</span>참가 선수는 복사되지 않아요. 새 경기는 모집 중으로 열리고, 나는 파티장으로 자동 참가해요.</p>
        {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
        <div className={styles.actions}>
          <Link className={styles.cancelLink} to={`/games/${numericId}`}>취소</Link>
          <button className={styles.primaryButton} type="submit" disabled={submitting}>{submitting ? '재경기 만드는 중…' : '재경기 만들기'}</button>
        </div>
      </form>
    </RematchFrame>
  )
}
