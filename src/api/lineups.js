import { request } from './client.js'

// BE D-21: 파티장만 호출한다. 성공 201 LineupResponse.
export function createLineup(gameId) {
  return request(`/games/${gameId}/lineups`, { method: 'POST' })
}

export function getLatestLineup(gameId) {
  return request(`/games/${gameId}/lineups/latest`)
}

export function confirmLineup(gameId) {
  return request(`/games/${gameId}/lineups/confirm`, { method: 'PATCH' })
}
