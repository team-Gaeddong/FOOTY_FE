// "내 경기": 내가 만든(파티장인) 경기를 예정/종료로 나눈다(제안서 ⑭·③).
// 내가 파티장인 경기만 BE `GET /games?role=host`(BE D-37)로 받는다. 예전의 "전체 목록에서 hostId로 거르기"를 대체했다.

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

// games: GameSummaryResponse[](여러 페이지를 이어 붙인 것도 된다)이고 모두 내가 파티장인 경기다.
// 반환: upcoming(가까운 일시부터), finished(최근 일시부터). 페이지 사이에 목록이 바뀌어 같은 경기가
// 두 번 오면 한 번만 센다.
export function groupMyGames(games) {
  const upcoming = []
  const finished = []

  const seen = new Set()
  for (const game of games) {
    if (seen.has(game.id)) continue
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

// 경기 카드 아래의 안내와 버튼 문구(시안). 버튼은 종료된 경기만 재경기 만들기, 나머지는 경기 관리(상세)다.
export function statusGuide(status) {
  if (status === 'RECRUITING') return '선수를 모으고 실력을 매기는 단계예요.'
  if (status === 'CONFIRMED') return '팀이 확정됐어요. 경기 후 종료해 주세요.'
  if (status === 'FINISHED') return '평가·MVP 결과를 보고 다음 경기를 열 수 있어요.'
  return ''
}
