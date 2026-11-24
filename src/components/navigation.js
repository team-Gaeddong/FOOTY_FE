// 전역 내비게이션이 경로마다 무엇을 보여 줄지 정하는 표다(새 시안 .mobile 기준).
//
// kind
//   'tab'     최상위 화면. 모바일은 FOOTY 로고 바 + 하단 탭
//   'sub'     하위 화면. 모바일은 하단 탭이 없고, bar가 true일 때만 "뒤로 가기 + 제목" 바를 보여 준다
//   'minimal' 모바일은 상단·하단 모두 없다(새 시안 범위 밖 화면, 알 수 없는 경로)
// PC(768px 이상)는 어느 화면에서나 상단 헤더를 보여 준다.
//
// bar: 화면이 자체 "← 돌아가기" 링크를 갖고 있으면 두 개가 겹치므로 false로 둔다.
//      각 화면 이슈에서 그 링크를 지우면서 true로 바꾼다.
// current: 주 메뉴·하단 탭에서 현재 항목('games' | 'mine' | 'profile'). 없으면 null
// title·back: 하위 바의 제목과 돌아갈 경로(경로 안의 :param은 현재 값으로 채운다)
//
// 정적 경로가 :param 경로보다 앞에 와야 한다(/games/mine이 /games/:gameId에 먼저 걸리면 안 된다).
// 라인업 탭(⑦)·경기 후 탭(⑬)이 생기면 해당 항목을 이 표에서 고친다.
export const ROUTE_TABLE = [
  { path: '/', kind: 'tab', current: 'games' },
  { path: '/games/mine', kind: 'tab', current: 'mine' },
  { path: '/profile', kind: 'tab', current: 'profile' },

  { path: '/games/new', kind: 'sub', title: '경기 만들기', back: '/', bar: true, current: null },
  { path: '/games/:gameId', kind: 'sub', title: '경기 상세', back: '/', bar: true, current: 'games' },
  { path: '/games/:gameId/notices', kind: 'sub', title: '경기 상세', back: '/games/:gameId', bar: false, current: 'games' },
  { path: '/games/:gameId/notices/new', kind: 'sub', title: '공지 작성', back: '/games/:gameId/notices', bar: false, current: 'games' },
  { path: '/games/:gameId/notices/:noticeId', kind: 'sub', title: '경기 상세', back: '/games/:gameId/notices', bar: false, current: 'games' },
  { path: '/games/:gameId/polls', kind: 'sub', title: '경기 상세', back: '/', bar: true, current: 'games' },
  { path: '/games/:gameId/polls/new', kind: 'sub', title: '투표 만들기', back: '/games/:gameId/polls', bar: true, current: 'games' },
  { path: '/games/:gameId/polls/:pollId', kind: 'sub', title: '경기 상세', back: '/', bar: true, current: 'games' },
  { path: '/games/:gameId/lineup', kind: 'sub', title: '경기 상세', back: '/', bar: true, current: 'games' },
  { path: '/games/:gameId/lineup/edit', kind: 'sub', title: '팀 짜기', back: '/games/:gameId', bar: true, current: 'games' },
  { path: '/games/:gameId/players', kind: 'sub', title: '선수 관리', back: '/games/:gameId', bar: true, current: 'games' },
  { path: '/games/:gameId/teams/:teamId/tactic', kind: 'sub', title: '전술 배치도', back: '/games/:gameId/lineup', bar: false, current: 'games' },
  { path: '/withdraw', kind: 'sub', title: '회원 탈퇴', back: '/profile', bar: true, current: null },

  // 새 시안 범위 밖(다른 팀원 담당)이라 모바일에서는 자체 화면 그대로 둔다
  { path: '/games/:gameId/balance-review', kind: 'minimal', current: 'games' },
  { path: '/games/:gameId/balance-summary', kind: 'minimal', current: 'games' },
  { path: '/games/:gameId/mvp-vote', kind: 'minimal', current: 'games' },
  { path: '/games/:gameId/report', kind: 'minimal', current: 'games' },
  { path: '/games/:gameId/rematch', kind: 'minimal', current: 'games' },
]

const FALLBACK = { kind: 'minimal', current: null }

function segmentsOf(path) {
  return path.split('/').filter(Boolean)
}

function fillParams(template, params) {
  return template.replace(/:([A-Za-z]+)/g, (_, name) => params[name])
}

// 경로에 맞는 표 항목을 돌려준다. 끝의 `/`는 무시하고, 맞는 항목이 없으면 minimal이다.
// 돌려주는 값: { kind, current, title?, back?, bar?, params }
export function matchRoute(pathname) {
  const target = segmentsOf(pathname)
  for (const route of ROUTE_TABLE) {
    const pattern = segmentsOf(route.path)
    if (pattern.length !== target.length) continue
    const params = {}
    const matched = pattern.every((part, index) => {
      if (!part.startsWith(':')) return part === target[index]
      params[part.slice(1)] = target[index]
      return true
    })
    if (!matched) continue
    return { ...route, params, back: route.back ? fillParams(route.back, params) : null }
  }
  return { ...FALLBACK, params: {}, back: null }
}

// 모바일에서 보여 줄 상단·하단: 'tab'(로고 바 + 하단 탭) | 'bar'(뒤로 가기 + 제목 바) | 'none'
export function mobileChrome(route) {
  if (route.kind === 'tab') return 'tab'
  if (route.kind === 'sub' && route.bar) return 'bar'
  return 'none'
}
