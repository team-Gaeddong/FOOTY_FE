// 내 프로필·회원 탈퇴 화면의 표시 규칙. ApiError(api/client.js)는 import.meta.env를 읽어 node:test에서 불러올 수 없어,
// status가 숫자인지로 API 오류를 가린다. 분기는 status·code로 하고 BE message는 쓰지 않는다(FD-04).
const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const isApiError = (error) => typeof error?.status === 'number'

// BE rating은 BigDecimal(소수 둘째 자리)이라 JSON 숫자로 온다. 경기 후 평점의 평균이고(BE D-38), 평점을 받은 경기가
// 2개 미만이면 null이라 '-'로 보여 준다.
export function formatRating(rating) {
  const value = Number(rating)
  if (rating === null || rating === undefined || rating === '' || !Number.isFinite(value)) return '-'
  return value.toFixed(2)
}

// GET /members/me의 positions({ position, priority }[])를 우선순위 순 포지션 배열로
export function sortedPositions(profile) {
  return [...(profile.positions ?? [])]
    .sort((a, b) => a.priority - b.priority)
    .map(({ position }) => position)
}

export function profileLoadMessage(error) {
  if (!isApiError(error)) return '프로필을 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  // 토큰의 onboarded와 DB가 어긋난 경우. BE는 DB 기준으로 막는다(BE D-05e).
  // 온보딩 화면은 토큰 기준으로 홈으로 돌려보내므로 이동하지 않고 안내만 한다.
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 프로필을 볼 수 있어요.'
  return '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// PUT /members/me/positions 실패 안내(BE D-13)
export function savePositionsMessage(error) {
  if (!isApiError(error)) return '포지션을 저장하지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'MEMBER_400_2' || error.code === 'GLOBAL_400_1') return '선호 포지션을 1~4개 골라 주세요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 저장할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '포지션을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function withdrawErrorMessage(error) {
  if (isApiError(error) && error.status === 0) return NETWORK_ERROR
  return '탈퇴하지 못했습니다. 다시 시도해 주세요.'
}

// 탈퇴 확인 화면의 안내. 닉네임을 모르면(프로필을 못 받았으면) 닉네임 안내는 뺀다.
export function withdrawFacts(nickname) {
  const facts = ['탈퇴하면 바로 로그아웃돼요.', '같은 Google 계정으로 다시 로그인하면 계정이 복구돼요.']
  if (nickname) facts.push(`닉네임 ‘${nickname}’은 탈퇴한 뒤에도 다른 사람이 쓸 수 없어요.`)
  return facts
}
