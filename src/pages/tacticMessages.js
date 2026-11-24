// ApiError(api/client.js)는 import.meta.env를 읽어 node:test에서 불러올 수 없어, status가 숫자인지로 API 오류를 가린다.
const isApiError = (error) => typeof error?.status === 'number'

// 전술 배치도 화면의 오류 안내. 분기는 status·code로 하고 BE message는 쓰지 않는다(FD-04).
export const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

export function loadErrorMessage(error) {
  if (!isApiError(error)) return '전술 배치도를 불러오지 못했습니다.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error.code === 'LINEUP_404_1') return '이 경기에 없는 팀이에요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '전술 배치도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// lock: 다시 저장해도 안 되는 경우라 편집을 막는다
export function saveErrorOf(error) {
  if (!isApiError(error)) return { message: '저장하지 못했습니다. 다시 시도해 주세요.' }
  if (error.status === 0) return { message: NETWORK_ERROR }
  if (error.code === 'GAME_403_1') return { message: '파티장만 전술을 저장할 수 있어요.', lock: true }
  if (error.code === 'LINEUP_409_4') return { message: '확정된 팀이라 전술을 바꿀 수 없어요.', lock: true }
  if (error.code === 'LINEUP_400_1') return { message: '같은 선수가 두 번 배치됐어요. 새로고침한 뒤 다시 배치해 주세요.' }
  if (error.code === 'LINEUP_400_2') return { message: '팀 구성이 바뀌었어요. 새로고침한 뒤 다시 배치해 주세요.' }
  if (error.code === 'GLOBAL_400_1') return { message: '배치 값이 올바르지 않아요. 11명 이하인지 확인해 주세요.' }
  if (error.code === 'GAME_404_1' || error.code === 'LINEUP_404_1') {
    return { message: '경기나 팀이 없어져 저장할 수 없어요.', lock: true }
  }
  if (error.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

export function imageErrorMessage(error) {
  if (!isApiError(error)) return '이미지를 만들지 못했어요. 다시 시도해 주세요.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1' || error.code === 'LINEUP_404_1') {
    return '경기나 팀이 없어져 이미지를 만들 수 없어요.'
  }
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '팀 배치를 불러오지 못해 이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
}
