import { request } from './client.js'

// BE D-23: 로그인 회원 누구나 조회한다. 배치 안 된 선수는 posX·posY가 null.
export function getTactic(gameId, teamId) {
  return request(`/games/${gameId}/teams/${teamId}/tactic`)
}

// BE D-23: 파티장만 저장한다. placements는 전체 교체라 빠진 팀원은 배치 해제된다.
// 좌표는 경기장 대비 퍼센트 0~100, 소수 2자리다.
export function updateTactic(gameId, teamId, { formation, placements }) {
  return request(`/games/${gameId}/teams/${teamId}/tactic`, {
    method: 'PUT',
    body: { formation, placements },
  })
}
