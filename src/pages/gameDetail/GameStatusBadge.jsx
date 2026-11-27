import { Badge } from '../../components/Badge.jsx'
import { gameStatusBadge } from './gameDetail.js'

// 경기 목록 카드·행의 상태 배지. 일정이 지난 모집 중·팀 확정 경기는 "일정 지남"으로 보인다.
export function GameStatusBadge({ game, className }) {
  const { tone, label } = gameStatusBadge(game)
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}
