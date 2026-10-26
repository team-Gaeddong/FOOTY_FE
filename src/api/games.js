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
