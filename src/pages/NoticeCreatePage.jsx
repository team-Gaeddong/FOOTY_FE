import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getGame } from '../api/games.js'
import { createNotice } from '../api/notices.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { Field } from '../components/Field.jsx'
import { ArrowLeftIcon, InfoIcon, LockIcon, PinIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { parseGameId } from './gameDetail.js'
import { dateTimeLabel } from './homeCalendar.js'
import { NOTICE_TITLE_MAX, createErrorMessage, loadErrorMessage, validateNotice } from './noticeView.js'
import styles from './NoticeCreatePage.module.css'

// 공지 작성(/games/:gameId/notices/new, 시안 NoticeNew). 파티장만 쓸 수 있다. 권한은 노출만 조절하고 최종 판단은 BE 응답(403)을 따른다.
// 올리면 새 공지가 열린 공지 탭으로 보낸다.
export function NoticeCreatePage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [gameResult, setGameResult] = useState(null) // { key: gameId, game } | { key: gameId, error }
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
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

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return

    const errors = validateNotice({ title, content })
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) return

    pending.current = true
    setSubmitting(true)
    try {
      const created = await createNotice(gameId, { title: title.trim(), content: content.trim() })
      navigate(`/games/${gameId}/notices/${created.id}`, { state: { notice: 'notice-created' } })
    } catch (requestError) {
      if (requestError.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        startTransition(() => clearSession())
        return
      }
      setError(createErrorMessage(requestError))
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  const game = current?.game ?? null
  const backTo = `/games/${gameId}/notices`

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
        <ErrorMessage>{loadErrorMessage(current.error)}</ErrorMessage>
        <Button as={Link} to={backTo} variant="secondary" fit="auto">
          공지 탭으로
        </Button>
      </div>
    )
  } else if (!game.isHost) {
    body = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="파티장만 공지를 쓸 수 있어요"
        actions={
          <Button as={Link} to={backTo} variant="secondary" fit="auto">
            공지 보기
          </Button>
        }
      >
        공지는 이 경기의 파티장만 작성할 수 있어요. 올라온 공지는 공지 탭에서 볼 수 있어요.
      </StateCard>
    )
  } else {
    body = (
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <section className={styles.card}>
          <Field
            label="제목"
            aside={`${title.length} / ${NOTICE_TITLE_MAX}`}
            name="title"
            type="text"
            value={title}
            maxLength={NOTICE_TITLE_MAX}
            placeholder="공지 제목을 입력해 주세요"
            autoComplete="off"
            error={fieldErrors.title}
            onChange={(event) => {
              setTitle(event.target.value)
              setFieldErrors((previous) => ({ ...previous, title: undefined }))
              setError('')
            }}
          />
          <Field
            as="textarea"
            label="내용"
            name="content"
            rows={8}
            value={content}
            placeholder="참가자에게 알릴 내용을 적어 주세요. 줄을 바꾸면 문단이 나뉘어요."
            error={fieldErrors.content}
            onChange={(event) => {
              setContent(event.target.value)
              setFieldErrors((previous) => ({ ...previous, content: undefined }))
              setError('')
            }}
          />
          <p className={styles.info}>
            <InfoIcon size={18} />
            <span>
              파티장과 이 경기 참가자만 볼 수 있어요. 올린 공지는 수정하거나 지울 수 없으니 한 번 더 읽어 주세요.
            </span>
          </p>
          <ErrorMessage>{error}</ErrorMessage>
        </section>

        <div className={styles.actions}>
          <Button as={Link} to={backTo} variant="subtle" fit="auto" className={styles.cancel}>
            취소
          </Button>
          <Button type="submit" size="lg" fit="responsive" disabled={submitting}>
            {submitting ? '올리는 중…' : '공지 올리기'}
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
          {game?.title ?? '공지'}
        </Link>
      )}
      <header className={styles.header}>
        {game && (
          <p className={styles.eyebrow}>
            {game.title} · {dateTimeLabel(game.playDate)}
          </p>
        )}
        <h1 className={styles.title}>공지 작성</h1>
        <p className={styles.lead}>참가자에게 알릴 내용을 적어 주세요.</p>
      </header>
      {body}
    </main>
  )
}
