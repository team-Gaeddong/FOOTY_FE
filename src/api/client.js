import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '../auth/tokenStore.js'

// FD-06: 개발 중에는 Vite proxy가 /api를 BE로 넘긴다(vite.config.js).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function apiUrl(path) {
  return `${BASE_URL}${path}`
}

// BE 에러 응답 {code, message}(BE D-04). 분기는 status와 code로 한다.
// 서버에 닿지 못하면 status 0, code null이다.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let handleSessionExpired = () => {}

// 재발급까지 실패해 다시 로그인해야 할 때 부를 함수를 등록한다.
export function setSessionExpiredHandler(handler) {
  handleSessionExpired = handler
}

async function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const accessToken = auth ? getAccessToken() : null
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, null, '서버에 연결할 수 없습니다.')
  }

  if (response.ok) {
    return response.status === 204 ? null : response.json()
  }
  const error = await response.json().catch(() => ({}))
  throw new ApiError(response.status, error.code ?? null, error.message ?? '')
}

let reissuing = null

async function reissue() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const tokens = await send('/auth/reissue', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    })
    saveTokens(tokens)
    return tokens
  } catch (error) {
    // 네트워크 오류면 refresh를 남겨 두고, BE가 거절했으면 지운다.
    if (error.status !== 0) clearTokens()
    return null
  }
}

// refresh는 재발급할 때마다 회전하므로(BE D-05d) 동시에 여러 번 요청하지 않는다.
export function refreshSession() {
  if (!reissuing) {
    reissuing = reissue().finally(() => {
      reissuing = null
    })
  }
  return reissuing
}

export async function request(path, options = {}) {
  try {
    return await send(path, options)
  } catch (error) {
    const auth = options.auth ?? true
    if (!auth || error.status !== 401) throw error

    // access 만료(30분) 등으로 401이면 한 번 재발급하고 다시 보낸다.
    const tokens = await refreshSession()
    if (!tokens) {
      handleSessionExpired()
      throw error
    }
    return send(path, options)
  }
}
