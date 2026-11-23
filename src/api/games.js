import { request } from './client.js'

export function createGame({ title, playDate, location, maxPlayers, teamCount }) {
  return request('/games', {
    method: 'POST',
    body: { title, playDate, location, maxPlayers, teamCount },
  })
}

// from·to는 경기 날짜(yyyy-MM-dd)이고 둘 다 그 날을 포함한다. status는 배열, role은 'host' | 'joined'(BE D-37).
export function listGames({ page = 0, size = 20, from, to, status, role } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (status?.length) params.set('status', status.join(','))
  if (role) params.set('role', role)
  return request(`/games?${params}`)
}

// 경기 목록을 size 100으로 마지막 페이지까지 한 페이지씩 돌려준다. BE에 "내 경기" 필터가 없어
// 파티장 확인·내 경기 모으기처럼 FE가 목록을 훑을 때 쓴다. maxPages로 상한을 둘 수 있다(기본은 끝까지).
export async function* listGamePages({ maxPages = Infinity, ...filters } = {}) {
  for (let page = 0; page < maxPages; page += 1) {
    const data = await listGames({ page, size: 100, ...filters })
    yield data
    if (page + 1 >= data.totalPages) return
  }
}

// 날짜 범위의 경기를 마지막 쪽까지 모아 한 배열로 준다. 범위를 줘도 쪽 규칙은 그대로(size 최대 100)라
// totalElements가 100을 넘으면 다음 쪽을 더 받는다(BE D-37).
export async function listGamesInRange({ from, to }) {
  const games = []
  for await (const data of listGamePages({ from, to })) games.push(...data.games)
  return games
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

// 파티장만, 모집 중인 경기에서만. positions는 1~4개, 순서가 우선순위이고 전부 교체된다(BE D-13). 성공은 204.
// 이 경기 선수가 아니면 404 GAME_404_2, 모집 중이 아니면 409 GAME_409_1.
export function updatePlayerPositions(gameId, gamePlayerId, positions) {
  return request(`/games/${gameId}/players/${gamePlayerId}/positions`, {
    method: 'PUT',
    body: { positions },
  })
}

// 로그인한 회원 누구나. isHost·isJoined는 요청자 기준, playerCount는 후보 포함(BE D-25).
// 선수 목록·라인업은 들어 있지 않다. 없거나 삭제된 경기는 404 GAME_404_1.
export function getGame(gameId) {
  return request(`/games/${gameId}`)
}

// 파티장만, 종료 전(모집 중·팀 확정) 경기만 소프트 삭제한다(BE D-33). 성공은 204.
// 파티장이 아니면 403 GAME_403_1, 없거나 이미 삭제됐으면 404 GAME_404_1, 종료된 경기면 409 GAME_409_5.
export function deleteGame(gameId) {
  return request(`/games/${gameId}`, { method: 'DELETE' })
}

// 회원 본인이 참가한다. positions는 1~4개, 순서가 우선순위(BE D-13·D-19). 성공은 201.
// 모집 중이 아니면 409 GAME_409_1, 이미 참가했으면 409 GAME_409_3.
export function joinGame(gameId, positions) {
  return request(`/games/${gameId}/players`, {
    method: 'POST',
    body: { positions },
  })
}
