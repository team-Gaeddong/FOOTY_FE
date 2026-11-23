import { NICKNAME_MAX, NICKNAME_MIN } from './nickname.js'

export const INVALID_NICKNAME = `닉네임은 앞뒤 공백을 제외하고 ${NICKNAME_MIN}~${NICKNAME_MAX}자여야 합니다.`
export const INVALID_POSITIONS = '선호 포지션을 1~4개 골라 주세요.'
export const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

// 닉네임 저장 실패를 화면이 다룰 종류로 나눈다. 화면 문구는 BE message가 아니라 code로 정한다(FD-04).
//   already  MEMBER_409_1 다른 탭 등에서 이미 온보딩을 마쳤다 → 포지션 저장은 이어서 한다
//   taken    MEMBER_409_2 다른 회원이 쓰는 닉네임(탈퇴한 회원 포함) → 안내 카드로 다시 입력받는다
//   invalid  MEMBER_400_1 형식 오류
//   network, unknown
export function describeNicknameFailure(error) {
  if (error.code === 'MEMBER_409_1') return { kind: 'already', field: null, message: null }
  if (error.code === 'MEMBER_409_2') return { kind: 'taken', field: 'nickname', message: null }
  if (error.code === 'MEMBER_400_1') return { kind: 'invalid', field: 'nickname', message: INVALID_NICKNAME }
  if (error.status === 0) return { kind: 'network', field: null, message: NETWORK_ERROR }
  return { kind: 'unknown', field: null, message: '저장하지 못했습니다. 다시 시도해 주세요.' }
}

// 닉네임은 이미 저장된 뒤라 포지션만 다시 보내면 된다는 안내를 붙인다.
export function describePositionsFailure(error) {
  if (error.code === 'MEMBER_400_2') {
    return { kind: 'invalid', field: 'positions', message: INVALID_POSITIONS }
  }
  const reason = error.status === 0 ? NETWORK_ERROR : '포지션을 저장하지 못했습니다.'
  return {
    kind: error.status === 0 ? 'network' : 'unknown',
    field: null,
    message: `${reason} 닉네임은 저장됐어요. 포지션만 다시 저장해 주세요.`,
  }
}
