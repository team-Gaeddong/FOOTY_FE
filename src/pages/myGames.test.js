import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupMyGames, loadErrorMessage } from './myGames.js'

const ME = 7

function game(id, hostId, status, playDate) {
  return { id, hostId, title: `경기 ${id}`, playDate, location: '구장', maxPlayers: 12, teamCount: 2, status }
}

const ids = (games) => games.map((candidate) => candidate.id)

test('내가 파티장인 경기만 남기고 다른 회원의 경기는 뺀다', () => {
  const games = [
    game(1, ME, 'RECRUITING', '2026-12-01T10:00:00'),
    game(2, 8, 'RECRUITING', '2026-12-02T10:00:00'),
    game(3, 9, 'FINISHED', '2026-11-01T10:00:00'),
    game(4, ME, 'FINISHED', '2026-11-02T10:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [1])
  assert.deepEqual(ids(finished), [4])
})

test('모집 중·팀 확정은 예정, 경기 종료는 종료로 나눈다', () => {
  const games = [
    game(1, ME, 'RECRUITING', '2026-12-01T10:00:00'),
    game(2, ME, 'CONFIRMED', '2026-12-02T10:00:00'),
    game(3, ME, 'FINISHED', '2026-11-01T10:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [1, 2])
  assert.deepEqual(ids(finished), [3])
})

test('예정된 경기는 가까운 일시부터, 종료된 경기는 최근 일시부터 정렬한다', () => {
  const games = [
    game(1, ME, 'RECRUITING', '2026-12-20T10:00:00'),
    game(2, ME, 'CONFIRMED', '2026-12-05T18:30:00'),
    game(3, ME, 'RECRUITING', '2026-12-05T09:00:00'),
    game(4, ME, 'FINISHED', '2026-10-01T10:00:00'),
    game(5, ME, 'FINISHED', '2026-11-15T20:00:00'),
    game(6, ME, 'FINISHED', '2026-11-15T09:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [3, 2, 1])
  assert.deepEqual(ids(finished), [5, 6, 4])
})

test('일시가 같으면 예정은 id 오름차순, 종료는 id 내림차순이다', () => {
  const games = [
    game(11, ME, 'RECRUITING', '2026-12-05T10:00:00'),
    game(10, ME, 'RECRUITING', '2026-12-05T10:00:00'),
    game(21, ME, 'FINISHED', '2026-11-05T10:00:00'),
    game(22, ME, 'FINISHED', '2026-11-05T10:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [10, 11])
  assert.deepEqual(ids(finished), [22, 21])
})

test('일시가 없는 경기는 어느 그룹에서든 맨 뒤에 둔다', () => {
  const games = [
    game(1, ME, 'RECRUITING', undefined),
    game(2, ME, 'RECRUITING', '2026-12-05T10:00:00'),
    game(3, ME, 'FINISHED', null),
    game(4, ME, 'FINISHED', '2026-11-05T10:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [2, 1])
  assert.deepEqual(ids(finished), [4, 3])
})

test('목록이 비어 있으면 두 그룹 모두 비어 있다', () => {
  assert.deepEqual(groupMyGames([], ME), { upcoming: [], finished: [] })
})

test('내가 만든 경기가 하나도 없으면 두 그룹 모두 비어 있다', () => {
  const games = [
    game(1, 8, 'RECRUITING', '2026-12-01T10:00:00'),
    game(2, 9, 'FINISHED', '2026-11-01T10:00:00'),
  ]
  assert.deepEqual(groupMyGames(games, ME), { upcoming: [], finished: [] })
})

test('내 회원 ID를 모르면 어떤 경기도 내 경기로 치지 않는다', () => {
  const games = [game(1, 8, 'RECRUITING', '2026-12-01T10:00:00')]
  assert.deepEqual(groupMyGames(games, undefined), { upcoming: [], finished: [] })
  assert.deepEqual(groupMyGames(games, null), { upcoming: [], finished: [] })
})

test('페이지 사이에 같은 경기가 두 번 와도 한 번만 센다', () => {
  const games = [
    game(1, ME, 'RECRUITING', '2026-12-01T10:00:00'),
    game(1, ME, 'RECRUITING', '2026-12-01T10:00:00'),
    game(2, ME, 'FINISHED', '2026-11-01T10:00:00'),
    game(2, ME, 'FINISHED', '2026-11-01T10:00:00'),
  ]
  const { upcoming, finished } = groupMyGames(games, ME)
  assert.deepEqual(ids(upcoming), [1])
  assert.deepEqual(ids(finished), [2])
})

test('알 수 없는 상태의 경기는 예정·종료 어느 쪽에도 넣지 않는다', () => {
  const games = [game(1, ME, 'CANCELED', '2026-12-01T10:00:00')]
  assert.deepEqual(groupMyGames(games, ME), { upcoming: [], finished: [] })
})

test('입력 배열을 바꾸지 않는다', () => {
  const games = [
    game(2, ME, 'RECRUITING', '2026-12-05T10:00:00'),
    game(1, ME, 'RECRUITING', '2026-12-01T10:00:00'),
  ]
  groupMyGames(games, ME)
  assert.deepEqual(ids(games), [2, 1])
})

test('불러오기 실패 안내는 status와 code로 고른다', () => {
  assert.match(loadErrorMessage({ status: 0, code: null }), /서버에 연결할 수 없습니다/)
  assert.match(loadErrorMessage({ status: 403, code: 'MEMBER_403_1' }), /온보딩을 마친 뒤/)
  assert.match(loadErrorMessage({ status: 401, code: 'AUTH_401_1' }), /로그인이 필요합니다/)
  assert.match(loadErrorMessage({ status: 500, code: null }), /불러오지 못했습니다/)
  assert.match(loadErrorMessage(new Error('boom')), /불러오지 못했습니다/)
})

test('불러오기 실패 안내는 BE message 문구를 쓰지 않는다', () => {
  const message = loadErrorMessage({ status: 500, code: 'GLOBAL_500_1', message: '내부 서버 문구' })
  assert.doesNotMatch(message, /내부 서버 문구/)
})
