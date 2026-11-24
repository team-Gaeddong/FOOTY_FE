import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROUTE_TABLE, matchRoute, mobileChrome } from './navigation.js'

test('최상위 화면은 tab이고 현재 항목이 정해진다', () => {
  assert.deepEqual(
    ['/', '/games/mine', '/profile'].map((path) => [matchRoute(path).kind, matchRoute(path).current]),
    [['tab', 'games'], ['tab', 'mine'], ['tab', 'profile']],
  )
})

test('/games/mine과 /games/new가 /games/:gameId에 먼저 걸리지 않는다', () => {
  assert.equal(matchRoute('/games/mine').kind, 'tab')
  assert.equal(matchRoute('/games/new').title, '경기 만들기')
  assert.equal(matchRoute('/games/12').title, '경기 상세')
})

test('경로의 값으로 돌아갈 경로를 채운다', () => {
  assert.equal(matchRoute('/games/12/notices').back, '/')
  assert.equal(matchRoute('/games/12/notices/new').back, '/games/12/notices')
  assert.equal(matchRoute('/games/12/teams/3/tactic').back, '/games/12/lineup')
  assert.equal(matchRoute('/games/12/polls/new').back, '/games/12/polls')
  assert.deepEqual(matchRoute('/games/12/teams/3/tactic').params, { gameId: '12', teamId: '3' })
})

test('끝의 슬래시는 무시한다', () => {
  assert.equal(matchRoute('/games/12/').title, '경기 상세')
  assert.equal(matchRoute('/profile/').kind, 'tab')
})

test('PC 주 메뉴의 현재 항목: 경기 하위 화면은 경기, 내 경기·만들기·프로필·탈퇴는 따로', () => {
  assert.equal(matchRoute('/games/12/lineup').current, 'games')
  assert.equal(matchRoute('/games/12/notices/7').current, 'games')
  assert.equal(matchRoute('/games/mine').current, 'mine')
  assert.equal(matchRoute('/games/new').current, null)
  assert.equal(matchRoute('/withdraw').current, null)
})

test('새 시안 범위 밖 화면과 알 수 없는 경로는 모바일에서 상단·하단이 없다', () => {
  for (const path of ['/games/1/mvp-vote', '/games/1/report', '/games/1/rematch', '/games/1/balance-review', '/games/1/balance-summary', '/nope']) {
    assert.equal(mobileChrome(matchRoute(path)), 'none', path)
  }
  assert.equal(matchRoute('/nope').back, null)
})

test('하위 바는 bar가 켜진 화면에서만 보인다', () => {
  assert.equal(mobileChrome(matchRoute('/withdraw')), 'bar')
  assert.equal(mobileChrome(matchRoute('/games/12/notices')), 'bar')
  assert.equal(mobileChrome(matchRoute('/games/12/notices/7')), 'bar')
  assert.equal(mobileChrome(matchRoute('/games/12/notices/new')), 'bar')
  assert.equal(mobileChrome(matchRoute('/games/12/polls')), 'none')
  assert.equal(mobileChrome(matchRoute('/games/mine')), 'tab')
})

test('하위 화면에는 제목과 돌아갈 경로가 모두 있다', () => {
  for (const route of ROUTE_TABLE.filter((entry) => entry.kind === 'sub')) {
    assert.ok(route.title, `${route.path} 제목`)
    assert.ok(route.back, `${route.path} 돌아갈 경로`)
  }
})

test('같은 경로가 표에 두 번 들어 있지 않다', () => {
  const paths = ROUTE_TABLE.map((entry) => entry.path)
  assert.equal(new Set(paths).size, paths.length)
})

test('선수 관리는 모바일 하위 바를 켜고, 옛 실력·포지션 경로는 표에 없다', () => {
  const players = matchRoute('/games/12/players')
  assert.equal(players.title, '선수 관리')
  assert.equal(players.bar, true)
  assert.equal(players.back, '/games/12')
  assert.equal(ROUTE_TABLE.some((route) => route.path.endsWith('/skill-levels') || route.path.endsWith('/positions')), false)
})

test('라인업 탭은 모바일 하위 바를 켜고, 팀 짜기는 /lineup/edit이다', () => {
  const tab = matchRoute('/games/12/lineup')
  assert.equal(tab.title, '경기 상세')
  assert.equal(tab.bar, true)
  assert.equal(tab.back, '/')
  const edit = matchRoute('/games/12/lineup/edit')
  assert.equal(edit.title, '팀 짜기')
  assert.equal(edit.back, '/games/12')
  assert.equal(edit.bar, true)
  assert.equal(edit.params.gameId, '12')
})

test('전술 배치도는 모바일 하위 바(뒤로 + 제목)를 켠다', () => {
  const route = matchRoute('/games/12/teams/3/tactic')
  assert.equal(route.title, '전술 배치도')
  assert.equal(route.bar, true)
})
