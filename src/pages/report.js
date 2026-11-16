// BE ReportReason과 BE D-30의 뜻 풀이. 하나만 고른다.
export const REPORT_REASONS = [
  { value: 'ABUSE', label: '욕설·비방' },
  { value: 'VIOLENT_PLAY', label: '거친 플레이·폭력' },
  { value: 'NO_SHOW', label: '무단 불참' },
  { value: 'OTHER', label: '기타' },
]

// BE CreateReportRequest: @Size(max = 500). Java String 길이(UTF-16 단위)라 JS length와 같게 센다.
export const DETAIL_MAX = 500

// 신고할 수 있는 선수: 회원이고 내가 아닌 참가자. 비회원 선수(memberId null)는 BE가 받지 않는다(BE D-30).
export function reportablePlayers(players, myMemberId) {
  return players.filter((player) => player.memberId !== null && player.memberId !== myMemberId)
}

export function isReportReason(value) {
  return REPORT_REASONS.some((reason) => reason.value === value)
}

export function isValidDetail(detail) {
  return detail.length <= DETAIL_MAX
}

// 공백만 쓴 상세 내용은 BE도 저장하지 않으므로 null로 보낸다. 앞뒤 공백은 BE처럼 그대로 둔다.
export function toDetail(detail) {
  return detail.trim() === '' ? null : detail
}
