import { BALANCE_REASONS } from './balanceReview.js'

// 밸런스 취합 결과 표시 규칙(BE D-29).

const REASON_LABELS = Object.fromEntries(BALANCE_REASONS.map((reason) => [reason.value, reason.label]))

// BE averageScore는 BigDecimal(소수 둘째 자리 반올림)이고 평가가 없으면 null이다.
export function formatAverage(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
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

// 모르는 사유 값은 그대로 보여준다(BE에 새 사유가 추가된 경우).
export function reasonLabel(value) {
  return REASON_LABELS[value] ?? value
}
