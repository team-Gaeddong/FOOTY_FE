import { BALANCE_REASONS } from './balanceReview.js'

// 밸런스 취합 결과 표시 규칙(BE D-29).

const REASON_LABELS = Object.fromEntries(BALANCE_REASONS.map((reason) => [reason.value, reason.label]))

// BE averageScore는 BigDecimal(소수 둘째 자리 반올림)이고 평가가 없으면 null이다.
// 시안처럼 소수 둘째 자리까지 맞춰 보여 준다(7 → "7.00").
export function formatAverage(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toFixed(2)
}

// 작성 진행률(0~1). 대상이 없으면 0이다.
export function progressRatio(reviewedCount, requiredCount) {
  if (!(requiredCount > 0)) return 0
  return Math.min(Math.max(reviewedCount / requiredCount, 0), 1)
}

// BE는 사유 6개를 모두 내려주지만, 빠진 키가 있어도 0으로 채워 항목 순서를 고정한다.
export function reasonRows(reasonCounts) {
  return BALANCE_REASONS.map(({ value, label }) => ({
    value,
    label,
    count: Number(reasonCounts?.[value] ?? 0) || 0,
  }))
}

// 결과 화면 막대: 응답이 많은 사유부터(같으면 정해진 순서), 막대 길이는 가장 많은 사유를 1로 둔다.
export function rankedReasonRows(reasonCounts) {
  const rows = reasonRows(reasonCounts)
  const max = Math.max(0, ...rows.map((row) => row.count))
  // sort는 안정 정렬이라 개수가 같으면 BALANCE_REASONS 순서가 유지된다.
  return rows
    .map((row) => ({ ...row, ratio: max > 0 ? row.count / max : 0 }))
    .sort((a, b) => b.count - a.count)
}

// 의견은 처음에 몇 개만 보여 주고 "모두 보기"로 펼친다.
export const REVIEW_PREVIEW_COUNT = 3

// 모르는 사유 값은 그대로 보여준다(BE에 새 사유가 추가된 경우).
export function reasonLabel(value) {
  return REASON_LABELS[value] ?? value
}
