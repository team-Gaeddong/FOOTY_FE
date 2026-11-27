// 선수 평점(경기 후, 파티장) 화면의 계산. BE D-41: 1.0~10.0, 0.5 단위, 종료된 경기에서만 저장한다.
// 경기 후 "평점"은 경기 전 "실력"(skillLevel, 1~10 정수, 팀 짜기용)과 다른 값이다. 두 말을 섞지 않는다.
// ApiError(api/client.js)는 import.meta.env를 읽어 node:test에서 불러올 수 없어, status가 숫자인지로 API 오류를 가린다.

export const RATING_MIN = 1
export const RATING_MAX = 10
// 아직 평점이 없는 선수에서 "+"를 누르면 이 값부터 시작한다(선수 관리의 실력 시작값 5와 맞춤).
export const RATING_START = 5

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const isApiError = (error) => typeof error?.status === 'number'

// BE BigDecimal은 JSON 숫자로 온다. 숫자가 아니면 null(아직 안 줌)로 본다.
function toRating(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// 0.5 단위 이동. 소수 오차가 생기지 않게 2배 정수로 계산한다. 평점이 없을 때 "−"는 아무것도 하지 않는다(null).
export function stepRating(current, delta) {
  if (current === null || current === undefined) return delta > 0 ? RATING_START : null
  const halves = Math.round(current * 2) + Math.sign(delta)
  return Math.min(RATING_MAX * 2, Math.max(RATING_MIN * 2, halves)) / 2
}

// 화면 표시: 7.5 → "7.5", 6 → "6.0", 없음 → "–"
export function formatRating(value) {
  return value === null || value === undefined ? '–' : value.toFixed(1)
}

// BE가 받는 값인지(1.0~10.0, 0.5 단위)
export function isValidRating(value) {
  return typeof value === 'number' && value >= RATING_MIN && value <= RATING_MAX && Number.isInteger(value * 2)
}

// 화면의 선수 줄. 참가 선수 목록(GET /games/{id}/players: 포지션·파티장 포함)을 참여 순 그대로 쓰고,
// 평점 목록(GET /games/{id}/players/ratings: 파티장을 뺀 평점 대상)의 값을 붙인다.
// 참가 선수 목록을 못 받았으면 평점 목록만으로 줄을 만든다(포지션 없이).
// 반환: [{ id, name, memberId, positions, isHost, ratable, rating }]
export function buildRatingRows({ ratings, players, hostId }) {
  const saved = new Map(ratings.map((player) => [player.gamePlayerId, toRating(player.rating)]))
  if (!players) {
    return ratings.map((player) => ({
      id: player.gamePlayerId,
      name: player.name,
      memberId: player.memberId ?? null,
      positions: [],
      isHost: false,
      ratable: true,
      rating: saved.get(player.gamePlayerId),
    }))
  }
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    memberId: player.memberId ?? null,
    positions: player.positions ?? [],
    isHost: player.memberId !== null && player.memberId !== undefined && player.memberId === hostId,
    ratable: saved.has(player.id),
    rating: saved.get(player.id) ?? null,
  }))
}

// drafts는 화면에서 고친 값만 담는다({ [gamePlayerId]: rating }). 없으면 저장된 값을 쓴다.
export function effectiveRating(row, drafts) {
  return drafts[row.id] ?? row.rating
}

// 저장된 값과 다른 선수만 보낸다. BE는 보낸 선수만 바꾼다.
export function changedRatings(rows, drafts) {
  return rows
    .filter((row) => row.ratable && drafts[row.id] !== undefined && drafts[row.id] !== row.rating)
    .map((row) => ({ gamePlayerId: row.id, rating: drafts[row.id] }))
}

// 입력 현황: 평점 대상 중 값이 있는 선수 수
export function ratingProgress(rows, drafts) {
  const ratable = rows.filter((row) => row.ratable)
  const rated = ratable.filter((row) => effectiveRating(row, drafts) !== null).length
  return { rated, total: ratable.length, ratio: ratable.length > 0 ? rated / ratable.length : 0 }
}

// 저장에 성공한 값을 줄에 반영한다.
export function applyRatings(rows, saved) {
  const values = new Map(saved.map(({ gamePlayerId, rating }) => [gamePlayerId, rating]))
  return rows.map((row) => (values.has(row.id) ? { ...row, rating: values.get(row.id) } : row))
}

// 불러오기 실패 안내. 파티장이 아니면(GAME_403_1) 화면이 따로 막는다.
export function ratingsLoadMessage(error) {
  if (!isApiError(error)) return '선수 평점을 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '선수 평점을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 저장 실패 안내. lock: 다시 저장해도 안 되는 경우라 입력을 막는다. reload: 목록을 다시 불러와야 한다.
// 분기는 status·code로 하고 BE message는 쓰지 않는다(FD-04).
export function ratingsSaveError(error) {
  if (!isApiError(error)) return { message: '평점을 저장하지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: NETWORK_ERROR }
  if (error.code === 'GAME_400_5') return { message: '평점은 1.0~10.0 사이에서 0.5 단위로 줄 수 있어요.' }
  if (error.code === 'GAME_400_6') return { message: '파티장 본인에게는 평점을 줄 수 없어요.' }
  if (error.code === 'GAME_400_1' || error.code === 'GLOBAL_400_1') {
    return { message: '저장 요청이 올바르지 않아요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error.code === 'GAME_403_1') return { message: '파티장만 평점을 줄 수 있어요.', lock: true }
  if (error.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  if (error.code === 'GAME_404_2') {
    return { message: '이 경기 선수가 아닌 사람이 있어요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error.code === 'GAME_409_6') return { message: '종료된 경기에서만 평점을 줄 수 있어요.', lock: true }
  if (error.code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 저장할 수 있어요.' }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '평점을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}
