const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

// 공지 작성 시각(LocalDateTime, 받은 한국시간 그대로)을 "11월 24일 21:10"으로 보여 준다(시안 Notices).
// 올해가 아니면 앞에 연도를 붙인다. 형식이 다르면 받은 값을 그대로 둔다.
export function formatNoticeTime(value, now = new Date()) {
  const match = DATE_TIME.exec(value ?? '')
  if (!match) return value ?? ''
  const [, year, month, day, hour, minute] = match
  const prefix = Number(year) === now.getFullYear() ? '' : `${year}년 `
  return `${prefix}${Number(month)}월 ${Number(day)}일 ${hour}:${minute}`
}
