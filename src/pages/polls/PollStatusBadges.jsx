import { Badge } from '../../components/Badge.jsx'
import { CheckIcon } from '../../components/Icons.jsx'
import styles from './PollStatusBadges.module.css'

// 카드·상세의 상태 배지: 진행 중/마감, 그리고 투표함(깊은 면)/미참여(빨강, 진행 중일 때만)
export function PollStatusBadges({ poll }) {
  return (
    <div className={styles.row}>
      <Badge tone={poll.isClosed ? 'gray' : 'green'}>{poll.isClosed ? '마감' : '진행 중'}</Badge>
      {poll.hasVoted ? (
        <Badge tone="deep">
          <CheckIcon size={12} />
          투표함
        </Badge>
      ) : (
        !poll.isClosed && <Badge tone="red">미참여</Badge>
      )}
    </div>
  )
}
