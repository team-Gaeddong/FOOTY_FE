// FD-05: access 토큰은 메모리에만, refresh 토큰은 localStorage에 둔다.
// 새로고침하면 access는 사라지고 refresh로 다시 발급받는다.
const REFRESH_TOKEN_KEY = 'footy.refreshToken'

let accessToken = null

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveTokens(tokens) {
  accessToken = tokens.accessToken
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  } catch {
    // 저장할 수 없는 환경이면 이번 탭에서만 로그인이 유지된다.
  }
}

export function clearTokens() {
  accessToken = null
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // 지울 수 없으면 무시한다.
  }
}
