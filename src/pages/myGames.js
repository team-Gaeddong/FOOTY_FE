// "내 경기": 내가 만든(파티장인) 경기를 예정/종료로 나눈다(제안서 ⑭·③).
// BE `GET /games`에 "내 경기" 필터가 없어 FE가 전체 목록에서 hostId로 거른다(임시, decisions.md FD-21).

// 예정된 경기는 모집 중·팀 확정, 종료된 경기는 경기 종료다. 그 밖의 status는 어느 쪽에도 넣지 않는다.
const UPCOMING_STATUSES = new Set(['RECRUITING', 'CONFIRMED'])

// BE LocalDateTime 문자열은 같은 형식이면 글자 순서가 시간 순서다.
// direction 1은 이른 일시부터(같으면 id 오름차순), -1은 늦은 일시부터(같으면 id 내림차순).
// 일시가 없는 경기는 방향과 관계없이 맨 뒤로 보낸다.
function comparePlayDate(direction) {
  return (a, b) => {
    const left = a.playDate ?? ''
    const right = b.playDate ?? ''
    if (left === right) return (a.id - b.id) * direction
    if (left === '') return 1
    if (right === '') return -1
    return (left < right ? -1 : 1) * direction
  }
}

// games: GameSummaryResponse[](여러 페이지를 이어 붙인 것도 된다), memberId: 내 회원 ID.
// 반환: upcoming(가까운 일시부터), finished(최근 일시부터). 페이지 사이에 목록이 바뀌어 같은 경기가
// 두 번 오면 한 번만 센다.
export function groupMyGames(games, memberId) {
  const upcoming = []
  const finished = []
  if (memberId === null || memberId === undefined) return { upcoming, finished }

  const seen = new Set()
  for (const game of games) {
    if (game.hostId !== memberId || seen.has(game.id)) continue
    seen.add(game.id)
    if (UPCOMING_STATUSES.has(game.status)) upcoming.push(game)
    else if (game.status === 'FINISHED') finished.push(game)
  }

  upcoming.sort(comparePlayDate(1))
  finished.sort(comparePlayDate(-1))
  return { upcoming, finished }
}

// 내 경기 불러오기 실패 안내. error는 ApiError(status, code) 또는 그 밖의 오류다(message 문구는 보지 않는다).
export function loadErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 내 경기를 볼 수 있어요.'
  if (error?.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '내 경기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
