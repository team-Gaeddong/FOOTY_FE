import { apiUrl, request } from './client.js'

// fetch가 아니라 페이지 이동으로 연다(BE D-05d).
export const GOOGLE_LOGIN_URL = apiUrl('/oauth2/authorization/google')

// 콜백의 1회용 코드(1분)를 TokenResponse로 바꾼다.
export function exchangeLoginCode(code) {
  return request('/auth/token', { method: 'POST', body: { code }, auth: false })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
