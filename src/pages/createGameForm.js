import { dayHeading, weekendTone } from './homeCalendar.js'

// BE GameService 검증(BE D-14): 정원 2~30명, 팀 수 2 이상·정원 이하, 일시는 현재 이후.
// 자동 팀 짜기는 팀 수와 관계없이 A·B 두 팀으로 나눈다(BE D-21). 시안이 팀 수를 고르게 해서 그대로 보낸다.
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 30
export const MIN_TEAMS = 2
export const TITLE_MAX = 100
export const LOCATION_MAX = 200

export const INITIAL_FORM = {
  title: '',
  date: '', // yyyy-MM-dd
  time: '', // HH:mm
  location: '',
  maxPlayers: 22,
  teamCount: 2,
}

const INVALID_MAX_PLAYERS = `최대 인원은 ${MIN_PLAYERS}~${MAX_PLAYERS}명 사이로 정해 주세요.`
const INVALID_TEAM_COUNT = '팀 수는 2팀 이상, 최대 인원 이하여야 합니다.'

export const TEAM_COUNT_HINT = '2팀 이상, 최대 인원 이하. 자동 팀 짜기는 현재 A·B 두 팀으로 나눠요.'

export function maxPlayersHint(maxPlayers) {
  return `${MIN_PLAYERS}~${MAX_PLAYERS}명. 더 많이 참가하면 실력 순으로 ${maxPlayers}명이 선발, 나머지는 후보가 돼요.`
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// 최대 인원을 바꾸면 팀 수가 그보다 많지 않게 함께 줄인다.
export function setMaxPlayers(form, value) {
  const maxPlayers = clamp(value, MIN_PLAYERS, MAX_PLAYERS)
  return { ...form, maxPlayers, teamCount: Math.min(form.teamCount, maxPlayers) }
}

export function setTeamCount(form, value) {
  return { ...form, teamCount: clamp(value, MIN_TEAMS, form.maxPlayers) }
}

// 입력 칸별 오류 문구. 비어 있으면 통과다.
export function validate(form) {
  const errors = {}
  const title = form.title.trim()
  const location = form.location.trim()

  if (!title) errors.title = '경기 제목을 입력해 주세요.'
  else if (title.length > TITLE_MAX) errors.title = `경기 제목은 ${TITLE_MAX}자 이하로 입력해 주세요.`

  if (!form.date) errors.date = '경기 날짜를 선택해 주세요.'
  if (!form.time) errors.time = '시작 시간을 선택해 주세요.'

  if (!location) errors.location = '장소를 입력해 주세요.'
  else if (location.length > LOCATION_MAX) errors.location = `장소는 ${LOCATION_MAX}자 이하로 입력해 주세요.`

  if (!Number.isInteger(form.maxPlayers) || form.maxPlayers < MIN_PLAYERS || form.maxPlayers > MAX_PLAYERS) {
    errors.maxPlayers = INVALID_MAX_PLAYERS
  }
  if (!Number.isInteger(form.teamCount) || form.teamCount < MIN_TEAMS || form.teamCount > form.maxPlayers) {
    errors.teamCount = INVALID_TEAM_COUNT
  }

  return errors
}

// BE `POST /games` 본문. playDate는 시간대 없는 한국시간 문자열이다.
export function toCreateRequest(form) {
  return {
    title: form.title.trim(),
    playDate: `${form.date}T${form.time}:00`,
    location: form.location.trim(),
    maxPlayers: form.maxPlayers,
    teamCount: form.teamCount,
  }
}

// "목록에 이렇게 보여요" 미리보기. 비어 있는 값은 자리 표시 문구로 채우고 filled로 구분한다.
export function previewOf(form) {
  const title = form.title.trim()
  const location = form.location.trim()
  return {
    time: form.time || '--:--',
    title: title || '경기 제목',
    titleFilled: title !== '',
    sub: `${location || '장소'} · 최대 ${form.maxPlayers}명 · ${form.teamCount}팀`,
    dateText: form.date ? dayHeading(form.date) : '날짜를 고르면 여기에 보여요',
    dateFilled: form.date !== '',
    tone: form.date ? weekendTone(form.date) : null,
  }
}

// 입력 칸에 붙일 수 있는 BE 오류는 그 칸에(field), 나머지는 폼 아래에(message만) 보여 준다.
// 분기는 상태 코드와 code로 하고 BE message에는 기대지 않는다.
export function submitErrorOf(error) {
  if (typeof error?.status !== 'number') return { message: '경기를 만들지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }
  if (error.code === 'GAME_400_2') return { field: 'maxPlayers', message: INVALID_MAX_PLAYERS }
  if (error.code === 'GAME_400_3') return { field: 'date', message: '경기 일시는 지금 이후로 선택해 주세요.' }
  if (error.code === 'GAME_400_4') return { field: 'teamCount', message: INVALID_TEAM_COUNT }
  if (error.code === 'GLOBAL_400_1') return { message: '입력값을 확인한 뒤 다시 시도해 주세요.' }
  if (error.code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 경기를 만들 수 있어요.' }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '경기를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}
