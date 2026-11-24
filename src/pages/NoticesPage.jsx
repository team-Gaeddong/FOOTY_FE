import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import { listNotices } from '../api/notices.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { ChevronDownIcon, LockIcon, MegaphoneIcon, PlusIcon } from '../components/Icons.jsx'
import { StateCard } from '../components/StateCard.jsx'
import { useMinWidth } from '../components/useMinWidth.js'
import { GameHeader } from './GameHeader.jsx'
import { NoticeBody } from './NoticeBody.jsx'
import { canOpenMemberTabs, parseGameId } from './gameDetail.js'
import { formatNoticeTime } from './noticeDate.js'
import { isNoticeForbidden, loadErrorMessage, noticePreview, pickNotice } from './noticeView.js'
import styles from './NoticesPage.module.css'

// 두 열(목록 + 상세)을 쓰는 최소 폭. 그보다 좁으면 펼침 목록이다.
const SPLIT_MIN_WIDTH = 1024

// 경기 상세의 공지 탭(/games/:gameId/notices, /notices/:noticeId, 시안 Notices).
// 목록 응답에 내용까지 들어 있어 상세를 따로 부르지 않고, 주소의 공지 번호로 어떤 공지를 보여 줄지만 정한다.
// 공지는 파티장과 참가자만 볼 수 있다(BE 403). 참가 여부를 알면 부르기 전에 막고, 그 밖의 403도 같은 카드로 보여 준다.
export function NoticesPage() {
  const { game } = useOutletContext()
  const params = useParams()
  // 주소에 공지 번호가 없으면 null(가장 최근 공지), 있는데 숫자가 아니면 어느 공지도 아닌 값(-1)이다
  const noticeId = params.noticeId === undefined ? null : (parseGameId(params.noticeId) ?? -1)
  const open = canOpenMemberTabs(game)
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, notices } | { key, error }
  const requestKey = `${game.id}:${retryCount}`
  const loaded = result?.key === requestKey ? result : null

  useEffect(() => {
    if (!open) return
    let active = true
    listNotices(game.id)
      .then((data) => {
        if (active) setResult({ key: requestKey, notices: data.notices })
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, error })
      })
    return () => {
      active = false
    }
  }, [game.id, open, requestKey])

  let content
  if (!open || (loaded?.error && isNoticeForbidden(loaded.error))) {
    content = (
      <StateCard
        icon={<LockIcon size={22} />}
        title="참가자만 볼 수 있어요"
        actions={
          <>
            {game.status === 'RECRUITING' && (
              <Button as={Link} to={`/games/${game.id}`} fit="auto">
                경기 참가하기
              </Button>
            )}
            <span className={styles.code}>GAME_403_1</span>
          </>
        }
      >
        공지와 투표는 파티장과 이 경기 참가자에게만 열려요.
      </StateCard>
    )
  } else if (!loaded) {
    content = (
      <p className={styles.message} role="status">
        공지를 불러오는 중…
      </p>
    )
  } else if (loaded.error) {
    content = (
      <div className={styles.message}>
        <ErrorMessage>{loadErrorMessage(loaded.error)}</ErrorMessage>
        <Button variant="secondary" fit="auto" onClick={() => setRetryCount((count) => count + 1)}>
          다시 시도
        </Button>
      </div>
    )
  } else {
    content = <NoticeList game={game} notices={loaded.notices} noticeId={noticeId} />
  }

  return (
    <>
      <GameHeader game={game} current="notices" />
      {content}
    </>
  )
}

function NoticeList({ game, notices, noticeId }) {
  const split = useMinWidth(SPLIT_MIN_WIDTH)
  const { notice: selected, missing } = pickNotice(notices, noticeId)

  const writeButton = game.isHost && (
    <Button as={Link} to={`/games/${game.id}/notices/new`} fit="auto">
      <PlusIcon size={18} />
      공지 작성
    </Button>
  )

  if (notices.length === 0) {
    return (
      <StateCard
        icon={<MegaphoneIcon size={22} />}
        title="등록된 공지가 없어요"
        actions={writeButton || undefined}
      >
        {game.isHost
          ? '참가자에게 알릴 내용이 있으면 공지를 작성해 보세요.'
          : '파티장이 공지를 올리면 여기에 보여요.'}
      </StateCard>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="notices-title">
      <div className={styles.toolbar}>
        <h2 id="notices-title" className={styles.count}>
          공지 {notices.length}개
        </h2>
        {writeButton}
      </div>

      {missing && (
        <StateCard
          compact
          icon={<MegaphoneIcon size={22} />}
          title="공지를 찾을 수 없어요"
          actions={
            <Button as={Link} to={`/games/${game.id}/notices`} variant="secondary" fit="auto">
              공지 목록으로
            </Button>
          }
        >
          삭제됐거나 이 경기의 공지가 아니에요.
        </StateCard>
      )}

      {!missing &&
        (split ? (
          <NoticeSplit game={game} notices={notices} selected={selected} />
        ) : (
          <NoticeAccordion key={selected.id} game={game} notices={notices} initialId={selected.id} />
        ))}
    </section>
  )
}

// PC: 왼쪽 목록(카드) + 오른쪽 상세. 고른 공지는 주소(/notices/:id)에 담아 공유·새로고침해도 유지된다.
function NoticeSplit({ game, notices, selected }) {
  return (
    <div className={styles.split}>
      <ul className={styles.list} aria-label="공지 목록">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link
              className={styles.card}
              to={`/games/${game.id}/notices/${notice.id}`}
              aria-current={notice.id === selected.id ? 'true' : undefined}
            >
              <span className={styles.cardTitle}>{notice.title}</span>
              <span className={styles.cardTime}>{formatNoticeTime(notice.createdAt)}</span>
              <span className={styles.cardPreview}>{noticePreview(notice.content)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <article className={styles.detail} aria-label="공지 내용">
        <NoticeBody notice={selected} hostNickname={game.host.nickname} withTitle />
      </article>
    </div>
  )
}

// 모바일·태블릿: 제목 줄을 눌러 펼치는 목록. 처음에는 고른(또는 가장 최근) 공지 하나가 펼쳐져 있다.
function NoticeAccordion({ game, notices, initialId }) {
  const [openId, setOpenId] = useState(initialId)

  return (
    <ul className={styles.accordion} aria-label="공지 목록">
      {notices.map((notice) => {
        const expanded = notice.id === openId
        const bodyId = `notice-body-${notice.id}`
        return (
          <li key={notice.id} className={styles.item} data-open={expanded}>
            <h3 className={styles.itemHeading}>
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={() => setOpenId(expanded ? null : notice.id)}
              >
                <span className={styles.toggleText}>
                  <span className={styles.itemTitle}>{notice.title}</span>
                  {!expanded && <span className={styles.cardTime}>{formatNoticeTime(notice.createdAt)}</span>}
                </span>
                {!expanded && <ChevronDownIcon size={18} />}
              </button>
            </h3>
            {expanded && (
              <div id={bodyId} className={styles.itemBody}>
                <NoticeBody notice={notice} hostNickname={game.host.nickname} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
