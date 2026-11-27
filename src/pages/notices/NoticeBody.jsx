import { Badge } from '../../components/Badge.jsx'
import { formatNoticeTime } from './noticeDate.js'
import { noticeParagraphs } from './noticeView.js'
import styles from './NoticeBody.module.css'

// 공지 한 건의 본문(시안 Notices): 파티장 배지 + 작성자·시각, 구분선, 문단.
// 공지는 파티장만 쓸 수 있고 응답에 작성자가 없어서 작성자는 경기의 파티장 닉네임이다.
// withTitle: PC 상세 패널처럼 제목까지 함께 보여 줄 때(펼침 목록은 제목을 따로 그린다).
export function NoticeBody({ notice, hostNickname, withTitle = false }) {
  return (
    <div className={styles.body}>
      <div className={styles.head}>
        {withTitle && <h3 className={styles.title}>{notice.title}</h3>}
        <div className={styles.byline}>
          <Badge tone="deep">파티장</Badge>
          <span className={styles.meta}>
            {hostNickname} · {formatNoticeTime(notice.createdAt)}
          </span>
        </div>
      </div>
      <hr className={styles.divider} />
      <div className={styles.paragraphs}>
        {noticeParagraphs(notice.content).map((line, index) => (
          <p key={index} className={styles.paragraph}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
