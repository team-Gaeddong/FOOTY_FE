import { request } from './client.js'

export function getMyProfile() {
  return request('/members/me')
}
