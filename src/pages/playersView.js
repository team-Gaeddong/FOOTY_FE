// 선수 관리(시안 Players): 파티장이 참가 선수의 실력(1~10)과 경기별 포지션을 한 화면에서 고친다.
// 실력·포지션을 저장하는 값 계산은 skillLevels.js·playerPositions.js에 있고, 여기에는 화면 규칙을 둔다.
import { SKILL_MAX, SKILL_MIN } from './skillLevels.js'

// 처음 눌렀을 때 시작하는 점수. 아직 점수가 없을 때 + 버튼을 누르면 한가운데에서 시작해 누르는 횟수를 줄인다.
export const SKILL_START = 5

// 모바일의 −/+ 버튼이 바꾸는 점수. 점수가 없을 때 −는 아무것도 하지 않는다(버튼도 잠근다).
export function stepSkill(current, delta) {
  if (current === null || current === undefined) return delta > 0 ? SKILL_START : null
  return Math.min(SKILL_MAX, Math.max(SKILL_MIN, current + delta))
}

// 화면을 어떻게 보여 줄지: 'edit' 파티장 + 모집 중(실력·포지션), 'scores' 파티장 + 모집이 끝남(실력만), 'forbidden' 파티장이 아님.
// 포지션은 모집 중에만 바꿀 수 있고(BE D-13), 실력은 경기 상태와 관계없이 바꿀 수 있다(BE #19). 최종 권한은 BE 응답이 정한다.
export function accessMode(game) {
  if (!game.isHost) return 'forbidden'
  return game.status === 'RECRUITING' ? 'edit' : 'scores'
}

// 진행 막대의 채움 비율(0~1)
export function ratedRatio(rated, total) {
  if (!(total > 0)) return 0
  return Math.min(Math.max(rated / total, 0), 1)
}

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

export function loadErrorMessage(error) {
  if (error?.status === 0) return NETWORK_ERROR
  if (error?.code === 'GAME_404_1') return '경기가 없거나 삭제됐어요.'
  if (error?.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  if (error?.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '참가 선수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 실력 저장 실패. lock: 다시 저장해도 안 되는 경우라 편집을 막는다. reload: 목록을 새로 받아야 하는 경우.
export function skillSaveError(error) {
  if (error?.status === 0) return { message: NETWORK_ERROR }
  if (error?.code === 'GAME_403_1') return { message: '파티장만 실력을 매길 수 있어요.', lock: true }
  if (error?.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  if (error?.code === 'GAME_404_2') {
    return { message: '참가 선수가 바뀌었어요. 목록을 다시 불러온 뒤 저장해 주세요.', reload: true }
  }
  if (error?.code === 'GAME_400_1' || error?.code === 'GLOBAL_400_1') {
    return { message: '실력 점수가 올바르지 않아요. 1~10 중에서 골라 주세요.' }
  }
  if (error?.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

export const INVALID_POSITIONS = '포지션을 1~4개 골라 주세요.'

// 포지션 저장 실패. lock: 포지션 편집을 막는다(모집이 끝남 등 GAME_409_1은 포지션만 잠근다).
export function positionSaveError(error) {
  if (error?.status === 0) return { message: NETWORK_ERROR }
  if (error?.code === 'GAME_403_1') return { message: '파티장만 포지션을 바꿀 수 있어요.', lock: true }
  if (error?.code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요.', lock: true }
  if (error?.code === 'GAME_409_1') {
    return { message: '모집이 끝난 경기라 포지션을 바꿀 수 없어요.', lock: true, positionsOnly: true }
  }
  if (error?.code === 'GAME_404_2') {
    return { message: '참가 선수가 바뀌었어요. 목록을 다시 불러와 주세요.', reload: true }
  }
  if (error?.code === 'MEMBER_400_2' || error?.code === 'GLOBAL_400_1') return { message: INVALID_POSITIONS }
  if (error?.code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 바꿀 수 있어요.' }
  if (error?.status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

// 저장 버튼 문구. 바꾼 선수가 있으면 수를 보여 준다.
export function saveButtonLabel({ saving, count, compact = false }) {
  if (saving) return '저장하는 중…'
  if (count === 0) return '실력 저장'
  return compact ? `실력 저장 · ${count}명` : '실력 저장'
}
