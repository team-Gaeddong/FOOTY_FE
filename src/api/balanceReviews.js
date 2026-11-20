import { request } from './client.js'

// 경기 이후 밸런스 작성(BE D-28). reasons·comment는 선택이다.
export function createBalanceReview(gameId, { score, reasons, comment }) {
  return request(`/games/${gameId}/balance-reviews`, {
    method: 'POST',
    body: { score, reasons, comment },
  })
}

// 밸런스 취합 결과(BE D-29). 파티장과 경기 참가자만 조회한다.
// 참가 회원 전원이 작성하기 전에는 completed=false, averageScore=null, teams=[]다.
export function getBalanceSummary(gameId) {
  return request(`/games/${gameId}/balance-reviews/summary`)
}
