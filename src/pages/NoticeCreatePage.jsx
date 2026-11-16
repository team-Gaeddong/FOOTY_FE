import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../api/client.js'
import { createNotice } from '../api/notices.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { parseGameId } from './gameDetail.js'
import styles from './NoticeCreatePage.module.css'

function formatCreatedAt(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '')
  if (!match) return value ?? ''
  return `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`
}

function submitErrorMessage(error) {
  if (!(error instanceof ApiError)) return '공지를 등록하지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error.code === 'GLOBAL_400_1') return '제목과 내용을 확인해 주세요.'
  if (error.code === 'GAME_403_1') return '이 경기의 파티장만 공지를 작성할 수 있어요.'
  if (error.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제되었거나 없는 경기예요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 공지를 작성할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '공지를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function NoticeCreatePage() {
  const { gameId: gameIdParam } = useParams()
  const gameId = parseGameId(gameIdParam)
  const location = useLocation()
  const game = location.state?.game?.id === gameId ? location.state.game : null
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [createdNotice, setCreatedNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return

    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    if (title.length > 100) {
      setError('제목은 100자 이하로 입력해 주세요.')
      return
    }
    if (gameId === null) {
      setError('경기 정보가 올바르지 않습니다.')
      return
    }

    pending.current = true
    setSubmitting(true)
    setError('')
    try {
      setCreatedNotice(await createNotice(gameId, { title: title.trim(), content: content.trim() }))
    } catch (requestError) {
      setError(submitErrorMessage(requestError))
    } finally {
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

  if (createdNotice) {
    return (
      <PageLayout>
        <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
        <section className={styles.successCard} aria-labelledby="notice-success-title">
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <p className={styles.eyebrow}>공지 등록 완료</p>
          <h1 id="notice-success-title">공지사항을 등록했어요</h1>
          <article className={styles.noticePreview}>
            <p className={styles.createdAt}>{formatCreatedAt(createdNotice.createdAt)}</p>
            <h2>{createdNotice.title}</h2>
            <p className={styles.contentPreview}>{createdNotice.content}</p>
          </article>
          <Link className={styles.primaryLink} to={`/games/${gameId}`}>경기 상세로 돌아가기</Link>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link className={styles.backLink} to={`/games/${gameId}`}>← 경기 상세</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>파티장 메뉴{game?.title ? ` · ${game.title}` : ` · 경기 #${gameId}`}</p>
        <h1>공지 작성</h1>
        <p className={styles.intro}>경기 참여자에게 전달할 내용을 작성해 주세요.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="notice-title">제목 <span aria-hidden="true">*</span></label>
          <input
            id="notice-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError('')
            }}
            maxLength={100}
            placeholder="공지 제목을 입력해 주세요"
            autoComplete="off"
            aria-invalid={Boolean(error && !title.trim())}
            aria-describedby="notice-title-hint"
          />
          <p id="notice-title-hint" className={styles.hint}>{title.length}/100자</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="notice-content">내용 <span aria-hidden="true">*</span></label>
          <textarea
            id="notice-content"
            name="content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              setError('')
            }}
            rows={8}
            placeholder="경기 참여자에게 전달할 공지사항을 입력해 주세요"
            aria-invalid={Boolean(error && !content.trim())}
          />
        </div>

        <ErrorMessage>{error}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '공지 등록 중…' : '공지 등록'}
        </Button>
      </form>
    </PageLayout>
  )
}
