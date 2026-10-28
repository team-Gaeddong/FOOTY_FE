import { request } from './client.js'

// 닉네임 입력으로 가입을 마친다. 성공은 204(BE D-05e).
export function completeOnboarding(nickname) {
  return request('/members/me/onboarding', { method: 'PATCH', body: { nickname } })
}

// 소프트 삭제 후 토큰도 무효화된다. 성공은 204.
export function withdraw() {
  return request('/members/me', { method: 'DELETE' })
}

// 배열 순서가 곧 우선순위(첫 번째가 1순위). 보낼 때마다 전체 교체, 성공은 204(BE D-13).
// 온보딩 전에는 403 MEMBER_403_1이므로 온보딩 PATCH가 성공한 뒤에 부른다.
export function updatePositions(positions) {
  return request('/members/me/positions', { method: 'PUT', body: { positions } })
}
