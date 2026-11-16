import { request } from './client.js'

export function createNotice(gameId, { title, content }) {
  return request(`/games/${gameId}/notices`, {
    method: 'POST',
    body: { title, content },
  })
}

export function listNotices(gameId) {
  return request(`/games/${gameId}/notices`)
}

export function getNotice(gameId, noticeId) {
  return request(`/games/${gameId}/notices/${noticeId}`)
}
