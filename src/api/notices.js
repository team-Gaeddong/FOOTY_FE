import { request } from './client.js'

export function createNotice(gameId, { title, content }) {
  return request(`/games/${gameId}/notices`, {
    method: 'POST',
    body: { title, content },
  })
}
