import { request } from './client.js'

export function createGame({ title, playDate, location, maxPlayers, teamCount }) {
  return request('/games', {
    method: 'POST',
    body: { title, playDate, location, maxPlayers, teamCount },
  })
}
