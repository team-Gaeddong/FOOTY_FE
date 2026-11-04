import { request } from './client.js'

export function createGame({ title, playDate, location, maxPlayers, teamCount }) {
  return request('/games', {
    method: 'POST',
    body: { title, playDate, location, maxPlayers, teamCount },
  })
}

export function listGames({ page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  return request(`/games?${params}`)
}

export function rematchGame(gameId, playDate) {
  return request(`/games/${gameId}/rematch`, {
    method: 'POST',
    body: { playDate },
  })
}

// 참여 순 목록. skillLevel은 파티장이 볼 때만 값이 있다(BE D-20).
export function listGamePlayers(gameId) {
  return request(`/games/${gameId}/players`)
}

// 파티장만. 보낸 선수만 바뀌고 성공은 204. 한 명이라도 이 경기 선수가 아니면 아무것도 반영되지 않는다(GAME_404_2).
export function updateSkillLevels(gameId, players) {
  return request(`/games/${gameId}/players/skill-levels`, {
    method: 'PATCH',
    body: { players },
  })
}
