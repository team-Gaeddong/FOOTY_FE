// 경기 후 탭(시안 DetailAfter)의 표시 규칙. 탭은 링크만 걸고, 평가·투표·신고·재경기는 각 화면이 한다.

// 경기 후 탭은 종료된 경기에서만 열린다.
export function isAfterOpen(game) {
  return game.status === 'FINISHED'
}

// GET /games/{id}/balance-reviews/me → { gameId, reviewed, review }(BE D-39). 참가하지 않았거나 종료 전이어도 오류가 아니라 reviewed=false다.
export function reviewBadge(me) {
  if (!me) return null
  return me.reviewed ? { tone: 'green', label: '작성 완료' } : { tone: 'red', label: '미작성' }
}

// GET /games/{id}/mvp-votes/me → { gameId, voted, gamePlayerId }
export function mvpBadge(mvp) {
  if (!mvp) return null
  return mvp.voted ? { tone: 'green', label: '투표 완료' } : { tone: 'red', label: '투표 전' }
}

// 작성 현황(GET .../balance-reviews/summary의 reviewedCount·requiredCount). 대상이 없으면(0명) 막대를 그리지 않는다.
export function reviewProgress(summary) {
  if (!summary || !(summary.requiredCount > 0)) return null
  const reviewed = Math.min(Math.max(summary.reviewedCount, 0), summary.requiredCount)
  return { reviewed, required: summary.requiredCount, ratio: reviewed / summary.requiredCount }
}

// 밸런스 결과는 작성 대상 전원이 작성하면 열린다(BE D-29 completed).
export function canViewBalanceResult(summary) {
  return summary?.completed === true
}

// 불러오기 실패 안내(분기는 status·code로, BE message는 쓰지 않는다). 401은 api 클라이언트가 재발급·로그인 이동을 처리한다.
export function afterLoadMessage(error) {
  if (typeof error?.status !== 'number') return '불러오지 못했어요.'
  if (error.status === 0) return '서버에 연결할 수 없어요.'
  return '불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
}
