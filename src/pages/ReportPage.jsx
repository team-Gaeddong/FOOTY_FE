import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { getGame, listGamePlayers } from '../api/games.js'
import { getMyProfile } from '../api/member.js'
import { createReport } from '../api/reports.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
import {
  DETAIL_MAX,
  REPORT_REASONS,
  isReportReason,
  isValidDetail,
  reportablePlayers,
  toDetail,
} from './report.js'
import styles from './ReportPage.module.css'

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const NOT_JOINED = '이 경기에 참가한 회원만 신고할 수 있어요.'
const EMPTY_FORM = { memberId: null, reason: '', detail: '' }

function loadErrorMessage(error) {
  if (!(error instanceof ApiError)) return '참가 선수를 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 신고할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '참가 선수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// lock: 다시 보내도 안 되는 경우라 폼을 닫는다. reload: 참가 선수 목록을 새로 받아야 하는 경우
function submitErrorOf(error) {
  if (!(error instanceof ApiError)) return { message: '신고하지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: NETWORK_ERROR }
  if (error.code === 'REPORT_409_1') {
    return { message: '이미 신고한 선수예요. 접수된 신고가 처리된 뒤에 다시 신고할 수 있어요.' }
  }
  if (error.code === 'REPORT_400_1') return { message: '자기 자신은 신고할 수 없어요.' }
  if (error.code === 'REPORT_403_1') return { message: NOT_JOINED, lock: true }
  if (error.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  // 신고자·피신고자 어느 쪽이 탈퇴해도 같은 코드다. 내가 탈퇴한 경우는 다시 불러올 때 로그인으로 보낸다.
  if (error.code === 'MEMBER_404_1') {
    return { message: '탈퇴한 회원은 신고할 수 없어요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error.code === 'GAME_404_2') {
    return { message: '이 경기에 참가하지 않은 선수예요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error.code === 'GLOBAL_400_1') {
    return { message: `선수와 사유를 고르고, 상세 내용은 ${DETAIL_MAX}자 이하로 써 주세요.` }
  }
  if (error.code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 신고할 수 있어요.' }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '신고하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

// 같은 경기에 참가한 회원을 신고한다(POST /games/{gameId}/reports, BE D-30).
// 참가하지 않았으면 안내만 보여준다. 최종 권한은 BE 응답(REPORT_403_1)으로 판단한다.
export function ReportPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const gameId = parseGameId(params.gameId)

  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${gameId}:${retryCount}`
  const [result, setResult] = useState(null) // { key, game, players, myMemberId } | { key, error }
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null) // { key, error } | { key, reportedName }
  const pending = useRef(false)

  const current = result?.key === requestKey ? result : null
  const currentSubmit = submitResult?.key === requestKey ? submitResult : null
  const submitError = currentSubmit?.error ?? null

  useEffect(() => {
    if (gameId === null) return
    let active = true

    Promise.all([getGame(gameId), listGamePlayers(gameId), getMyProfile()])
      .then(([game, playerData, profile]) => {
        if (active) {
          setResult({ key: requestKey, game, players: playerData.players, myMemberId: profile.memberId })
        }
      })
      .catch((error) => {
        if (!active) return
        if (error.code === 'MEMBER_404_1') {
          navigate('/login', { replace: true, state: { error: 'member_not_found' } })
          startTransition(() => clearSession())
          return
        }
        setResult({ key: requestKey, error })
      })

    return () => {
      active = false
    }
  }, [gameId, requestKey, navigate, clearSession])

  function updateForm(patch) {
    setForm({ ...form, ...patch })
    setSubmitResult(null)
  }

  function reload() {
    setForm({ ...form, memberId: null })
    setSubmitResult(null)
    setRetryCount((count) => count + 1)
  }

  function reportAnother() {
    setForm(EMPTY_FORM)
    setSubmitResult(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current || !current?.game) return
    const target = reportablePlayers(current.players, current.myMemberId).find(
      (player) => player.memberId === form.memberId,
    )
    if (!target) {
      setSubmitResult({ key: requestKey, error: { message: '신고할 선수를 골라 주세요.', field: 'target' } })
      return
    }
    if (!isReportReason(form.reason)) {
      setSubmitResult({ key: requestKey, error: { message: '신고 사유를 골라 주세요.', field: 'reason' } })
      return
    }
    if (!isValidDetail(form.detail)) {
      setSubmitResult({
        key: requestKey,
        error: { message: `상세 내용은 ${DETAIL_MAX}자 이하로 써 주세요.`, field: 'detail' },
      })
      return
    }

    pending.current = true
    setSubmitting(true)
    setSubmitResult(null)
    try {
      await createReport(gameId, {
        reportedMemberId: target.memberId,
        reason: form.reason,
        detail: toDetail(form.detail),
      })
      setForm(EMPTY_FORM)
      setSubmitResult({ key: requestKey, reportedName: target.name })
    } catch (error) {
      setSubmitResult({ key: requestKey, error: submitErrorOf(error) })
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  const backLink = gameId === null ? (
    <Link className={styles.backLink} to="/games">← 경기 목록</Link>
  ) : (
    <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
  )

  if (gameId === null) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>경기 주소가 올바르지 않아요</h1>
          <p className={styles.muted}>경기 목록에서 다시 선택해 주세요.</p>
          <Link className={styles.primaryLink} to="/games">경기 목록 보기</Link>
        </section>
      </PageLayout>
    )
  }

  if (!current) return <LoadingScreen />

  if (current.error) {
    return (
      <PageLayout>
        {backLink}
        <section className={styles.panel}>
          <h1>참가 선수 신고</h1>
          <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
          <Button variant="secondary" onClick={reload}>다시 불러오기</Button>
        </section>
      </PageLayout>
    )
  }

  const { game, players, myMemberId } = current
  const candidates = reportablePlayers(players, myMemberId)
  const hasGuests = players.some((player) => player.memberId === null)

  let content
  if (currentSubmit?.reportedName) {
    content = (
      <section className={styles.panel}>
        <h2>신고를 접수했어요</h2>
        <p className={styles.muted} role="status">
          {currentSubmit.reportedName} 선수에 대한 신고가 접수됐어요.
        </p>
        <Link className={styles.primaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
        <Button variant="secondary" onClick={reportAnother}>다른 선수 신고하기</Button>
      </section>
    )
  } else if (!game.isJoined || submitError?.lock) {
    content = (
      <section className={styles.panel}>
        <ErrorMessage>{submitError?.lock ? submitError.message : NOT_JOINED}</ErrorMessage>
        <Link className={styles.primaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
      </section>
    )
  } else if (candidates.length === 0) {
    content = (
      <section className={styles.panel}>
        <h2>신고할 수 있는 선수가 없어요</h2>
        <p className={styles.muted}>
          {hasGuests
            ? '나 말고 참가한 회원이 없어요. 비회원 선수는 신고할 수 없어요.'
            : '나 말고 참가한 회원이 없어요.'}
        </p>
        <Link className={styles.primaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
      </section>
    )
  } else {
    content = (
      <form className={styles.panel} onSubmit={handleSubmit} noValidate>
        <fieldset
          className={styles.group}
          disabled={submitting}
          aria-invalid={submitError?.field === 'target' || undefined}
        >
          <legend>신고할 선수</legend>
          <ul className={styles.options}>
            {candidates.map((player) => (
              <li key={player.id}>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="reportedMemberId"
                    checked={form.memberId === player.memberId}
                    onChange={() => updateForm({ memberId: player.memberId })}
                  />
                  <span className={styles.optionText}>{player.name}</span>
                </label>
              </li>
            ))}
          </ul>
          {hasGuests && <p className={styles.hint}>비회원 선수는 신고할 수 없어요.</p>}
        </fieldset>

        <fieldset
          className={styles.group}
          disabled={submitting}
          aria-invalid={submitError?.field === 'reason' || undefined}
        >
          <legend>신고 사유</legend>
          <ul className={styles.options}>
            {REPORT_REASONS.map((reason) => (
              <li key={reason.value}>
                <label className={styles.option}>
                  <input
                    type="radio"
                    name="reason"
                    checked={form.reason === reason.value}
                    onChange={() => updateForm({ reason: reason.value })}
                  />
                  <span className={styles.optionText}>{reason.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className={styles.group}>
          <div className={styles.detailHeader}>
            <label htmlFor="report-detail">
              상세 내용 <span className={styles.optional}>(선택)</span>
            </label>
            <span className={styles.counter} aria-hidden="true">
              {form.detail.length} / {DETAIL_MAX}
            </span>
          </div>
          <textarea
            id="report-detail"
            className={styles.textarea}
            rows={5}
            maxLength={DETAIL_MAX}
            value={form.detail}
            onChange={(event) => updateForm({ detail: event.target.value })}
            disabled={submitting}
            aria-invalid={submitError?.field === 'detail' || undefined}
            aria-describedby="report-detail-hint"
          />
          <p id="report-detail-hint" className={styles.hint}>
            어떤 일이 있었는지 {DETAIL_MAX}자까지 쓸 수 있어요.
          </p>
        </div>

        <ErrorMessage>{submitError?.message}</ErrorMessage>
        {submitError?.reload && (
          <Button variant="secondary" onClick={reload} disabled={submitting}>
            목록 다시 불러오기
          </Button>
        )}
        <Button type="submit" variant="danger" disabled={submitting}>
          {submitting ? '신고하는 중…' : '신고하기'}
        </Button>
      </form>
    )
  }

  return (
    <PageLayout>
      {backLink}
      <header className={styles.header}>
        <p className={styles.eyebrow}>{game.title}</p>
        <h1>참가 선수 신고</h1>
        <p>이 경기에 함께 참가한 회원을 신고할 수 있어요.</p>
      </header>
      {content}
    </PageLayout>
  )
}
