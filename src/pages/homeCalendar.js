// 홈의 날짜 줄(오늘부터 7일)과 하루 단위 경기 목록을 계산한다.
// 날짜는 'yyyy-MM-dd' 문자열로 다루고 계산은 UTC로 해서 시간대·서머타임에 흔들리지 않는다.
// 경기 일시(playDate)는 BE가 시간대 없이 내려 주는 'yyyy-MM-ddTHH:mm:ss'라서 문자열 그대로 쪼갠다.
// 시간대(FD-12)는 미결정이므로 지금 코드의 표시 방식을 유지한다. "오늘"만 브라우저의 날짜를 쓴다.

export const DAYS_PER_VIEW = 7

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (value) => String(value).padStart(2, '0')

function parseDate(date) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

export function addDays(date, days) {
  const { year, month, day } = parseDate(date)
  const moved = new Date(Date.UTC(year, month - 1, day + days))
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`
}

export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function weekdayIndex(date) {
  const { year, month, day } = parseDate(date)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// 시작일부터 count일. tone은 토요일 'sat', 일요일 'sun'(날짜 글자색)이다.
export function buildDays(startDate, today, count = DAYS_PER_VIEW) {
  return Array.from({ length: count }, (_, offset) => {
    const date = addDays(startDate, offset)
    const weekday = weekdayIndex(date)
    return {
      date,
      day: parseDate(date).day,
      weekday: WEEKDAYS[weekday],
      isToday: date === today,
      tone: weekendTone(date),
    }
  })
}

export function windowEnd(startDate, count = DAYS_PER_VIEW) {
  return addDays(startDate, count - 1)
}

// "11월 23일 – 29일", 달이 바뀌면 "11월 28일 – 12월 4일"
export function rangeLabel(startDate, count = DAYS_PER_VIEW) {
  const start = parseDate(startDate)
  const end = parseDate(windowEnd(startDate, count))
  const endText = start.month === end.month ? `${end.day}일` : `${end.month}월 ${end.day}일`
  return `${start.month}월 ${start.day}일 – ${endText}`
}

// "11월 23일 월요일"
export function dayHeading(date) {
  const { month, day } = parseDate(date)
  return `${month}월 ${day}일 ${WEEKDAYS[weekdayIndex(date)]}요일`
}

// 토요일 'sat', 일요일 'sun', 그 밖은 null(날짜 글자색)
export function weekendTone(date) {
  const weekday = weekdayIndex(date)
  return weekday === 6 ? 'sat' : weekday === 0 ? 'sun' : null
}

// 날짜 버튼의 읽기 이름: "11월 23일 · 경기 있음"
export function dayAriaLabel(date, hasGames) {
  const { month, day } = parseDate(date)
  return `${month}월 ${day}일 · ${hasGames ? '경기 있음' : '경기 없음'}`
}

// 이번 창에 오늘이 있으면 오늘, 없으면 창의 첫날을 고른다.
export function pickSelectedDay(startDate, today, count = DAYS_PER_VIEW) {
  return today >= startDate && today <= windowEnd(startDate, count) ? today : startDate
}

export function playDateKey(playDate) {
  return /^(\d{4}-\d{2}-\d{2})/.exec(playDate)?.[1] ?? null
}

// "2026-11-23T19:00:00" → "19:00"
export function playTime(playDate) {
  return /T(\d{2}:\d{2})/.exec(playDate)?.[1] ?? ''
}

// 날짜별로 묶고, 하루 안에서는 시작 시간 순(같으면 id 순)으로 정렬한다.
export function groupGamesByDate(games) {
  const groups = {}
  for (const game of games) {
    const key = playDateKey(game.playDate)
    if (key === null) continue
    ;(groups[key] ??= []).push(game)
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) =>
      a.playDate < b.playDate ? -1 : a.playDate > b.playDate ? 1 : a.id - b.id,
    )
  }
  return groups
}

// "최대 12명 · 2팀"
export function capacityText(game) {
  return `최대 ${game.maxPlayers}명 · ${game.teamCount}팀`
}

export function gameSubtitle(game) {
  return `${game.location} · ${capacityText(game)}`
}

// 분기는 상태 코드와 code로 하고 BE message에는 기대지 않는다.
export function homeErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 경기를 볼 수 있어요.'
  if (error?.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '경기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 경기 일시를 "11월 27일 금요일 20:00"으로(24시간제). 읽을 수 없는 값은 빈 문자열이다.
export function dateTimeLabel(playDate) {
  const key = playDateKey(playDate ?? '')
  if (key === null) return ''
  const time = playTime(playDate)
  return time ? `${dayHeading(key)} ${time}` : dayHeading(key)
}
