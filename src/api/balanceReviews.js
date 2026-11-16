import { request } from './client.js'

// 경기 이후 밸런스 작성(BE D-28). reasons·comment는 선택이다.
export function createBalanceReview(gameId, { score, reasons, comment }) {
  return request(`/games/${gameId}/balance-reviews`, {
    method: 'POST',
    body: { score, reasons, comment },
  })
}
