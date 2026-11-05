const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

// BE LocalDateTime 문자열(시간대 없음, 한국시간 기준)을 그대로 읽는다.
// 브라우저 시간대로 바꾸지 않으려고 Date 변환 없이 숫자만 꺼낸다(FD-12 미결정).
function parse(value) {
  const match = DATE_TIME.exec(value ?? '')
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  return { year, month, day, hour, minute }
}

// "2026-11-08T08:00:00" → "11월 8일 (토) 오전 8:00"
export function formatPlayDate(value) {
  const date = parse(value)
  if (!date) return value ?? ''
  const { year, month, day, hour, minute } = date
  // 요일은 날짜만으로 정해지므로 UTC로 계산해도 시간대 영향이 없다.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  const meridiem = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${month}월 ${day}일 (${weekday}) ${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`
}

// "2026-11-01T14:03:12" → "11월 1일"
export function formatCreatedDate(value) {
  const date = parse(value)
  if (!date) return value ?? ''
  return `${date.month}월 ${date.day}일`
}

// 참가 인원 막대의 채움 비율(0~1). 참가는 정원을 넘을 수 있어(BE D-19) 1에서 자른다.
export function fillRatio(playerCount, maxPlayers) {
  if (!(maxPlayers > 0)) return 0
  return Math.min(Math.max(playerCount / maxPlayers, 0), 1)
}

// 경로의 gameId. 양의 정수가 아니면 null.
export function parseGameId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
