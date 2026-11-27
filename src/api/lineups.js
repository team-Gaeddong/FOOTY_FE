import { request } from './client.js'

// BE D-21: 파티장만 호출한다. 성공 201 LineupResponse.
export function createLineup(gameId) {
  return request(`/games/${gameId}/lineups`, { method: 'POST' })
}

export function getLatestLineup(gameId) {
  return request(`/games/${gameId}/lineups/latest`)
}

// BE #82(제안, 아직 병합 전): 파티장만, 팀 확정 전·모집 중인 경기에서만. 최신 라인업의 팀 소속을 전체 교체한다.
// teams는 [{ teamId, gamePlayerIds }]이고 라인업의 모든 팀·모든 선수를 한 번씩 담는다(팀마다 1명 이상).
// 성공 200은 GET .../lineups/latest와 같은 LineupResponse. 실패 code는 GAME_403_1, GAME_404_1, GAME_409_1,
// LINEUP_404_2, LINEUP_409_4, LINEUP_400_1~5, GLOBAL_400_1이다. docs/api/backend-api.md 참고.
export function updateLineupTeams(gameId, teams) {
  return request(`/games/${gameId}/lineups/latest/teams`, { method: 'PUT', body: { teams } })
}

export function confirmLineup(gameId) {
  return request(`/games/${gameId}/lineups/confirm`, { method: 'PATCH' })
}

// BE D-40: 파티장만, 팀이 확정된(CONFIRMED) 경기에서만. 최신 라인업의 확정을 풀고 경기를 모집 중(RECRUITING)으로 되돌린다.
// 팀 구성·전술 배치는 그대로다. 성공 200은 LineupResponse(isConfirmed: false). 실패 code는 GAME_403_1, GAME_404_1,
// LINEUP_409_5(팀 확정 경기가 아님: 모집 중·종료), LINEUP_404_2다.
export function cancelLineupConfirmation(gameId) {
  return request(`/games/${gameId}/lineups/confirm/cancel`, { method: 'PATCH' })
}
