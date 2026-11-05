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

// 로그인한 회원 누구나. isHost·isJoined는 요청자 기준, playerCount는 후보 포함(BE D-25).
// 선수 목록·라인업은 들어 있지 않다. 없거나 삭제된 경기는 404 GAME_404_1.
export function getGame(gameId) {
  return request(`/games/${gameId}`)
}

// 회원 본인이 참가한다. positions는 1~4개, 순서가 우선순위(BE D-13·D-19). 성공은 201.
// 모집 중이 아니면 409 GAME_409_1, 이미 참가했으면 409 GAME_409_3.
export function joinGame(gameId, positions) {
  return request(`/games/${gameId}/players`, {
    method: 'POST',
    body: { positions },
  })
}
