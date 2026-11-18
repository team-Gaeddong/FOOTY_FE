import { request } from './client.js'

export function createMvpVote(gameId, gamePlayerId) {
  return request(`/games/${gameId}/mvp-votes`, {
    method: 'POST',
    body: { gamePlayerId },
  })
}

export function getMvpVoteResult(gameId) {
  return request(`/games/${gameId}/mvp-votes/result`)
}

export function getMyMvpVote(gameId) {
  return request(`/games/${gameId}/mvp-votes/me`)
}
