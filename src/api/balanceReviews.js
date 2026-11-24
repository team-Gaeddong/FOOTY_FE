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

// 내 밸런스 평가 여부(BE D-39). 로그인한 회원 누구나 본인 것만 조회한다. { gameId, reviewed, review }.
// 참가하지 않은 회원이나 종료 전 경기도 오류가 아니라 reviewed=false다. 없는 경기는 404 GAME_404_1.
export function getMyBalanceReview(gameId) {
  return request(`/games/${gameId}/balance-reviews/me`)
}
