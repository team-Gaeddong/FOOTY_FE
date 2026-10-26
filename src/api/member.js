import { request } from './client.js'

// 닉네임 입력으로 가입을 마친다. 성공은 204(BE D-05e).
export function completeOnboarding(nickname) {
  return request('/members/me/onboarding', { method: 'PATCH', body: { nickname } })
}

// 소프트 삭제 후 토큰도 무효화된다. 성공은 204.
export function withdraw() {
  return request('/members/me', { method: 'DELETE' })
}
