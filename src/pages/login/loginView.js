// 콜백·다른 화면이 넘겨준 state로 로그인 화면이 무엇을 보여 줄지 정한다.

// location.state.error별 안내. code_expired(로그인 코드 만료, AUTH_401_1)는 시안 States의 안내 카드로,
// 나머지는 로그인 카드 안의 에러 문구로 보여 준다.
const ERROR_MESSAGES = {
  login_failed: 'Google 로그인에 실패했습니다. 다시 시도해 주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  member_not_found: '회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.',
  unknown: '로그인 중 문제가 발생했습니다. 다시 시도해 주세요.',
}

// location.state.notice별 안내(다른 화면이 넘겨준다)
const NOTICE_MESSAGES = {
  withdrawn: '탈퇴가 완료되었습니다. 같은 Google 계정으로 다시 로그인하면 계정이 복구됩니다.',
}

// 반환: { kind: 'expired' } | { kind: 'text', message } | null
export function loginErrorView(key) {
  if (key === 'code_expired') return { kind: 'expired' }
  const message = key ? ERROR_MESSAGES[key] : undefined
  return message ? { kind: 'text', message } : null
}

export function loginNoticeMessage(key) {
  return (key && NOTICE_MESSAGES[key]) || null
}
