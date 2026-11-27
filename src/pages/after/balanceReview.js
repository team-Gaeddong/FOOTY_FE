// 경기 이후 밸런스 작성 규칙(BE D-28).

export const MIN_SCORE = 1
export const MAX_SCORE = 10
// BE @Size(max = 500)는 Java String 길이(UTF-16 단위)로 센다.
export const MAX_COMMENT_LENGTH = 500

// BE BalanceReason 순서와 D-28 문구
export const BALANCE_REASONS = [
  { value: 'OUR_TEAM_TOO_WEAK', label: '우리 팀이 너무 못한다' },
  { value: 'OPPONENT_TOO_STRONG', label: '상대 팀이 너무 잘한다' },
  { value: 'SKILL_GAP', label: '개인 실력 차이가 컸다' },
  { value: 'POSITION_MISMATCH', label: '포지션 배치가 안 맞았다' },
  { value: 'HEADCOUNT_MISMATCH', label: '인원이 안 맞았다' },
  { value: 'WELL_BALANCED', label: '팽팽하고 재밌었다' },
]

export function isValidScore(score) {
  return Number.isInteger(score) && score >= MIN_SCORE && score <= MAX_SCORE
}

// 고른 사유를 켜고 끈다. 순서는 BALANCE_REASONS를 따라 중복이 생기지 않는다.
export function toggleReason(reasons, value) {
  const next = reasons.includes(value)
    ? reasons.filter((reason) => reason !== value)
    : [...reasons, value]
  return BALANCE_REASONS.map((reason) => reason.value).filter((reason) => next.includes(reason))
}

// 공백만인 의견은 보내지 않는다(BE도 NULL로 저장한다).
export function toReviewRequest({ score, reasons, comment }) {
  const trimmed = comment.trim()
  return { score, reasons, comment: trimmed ? trimmed : null }
}
