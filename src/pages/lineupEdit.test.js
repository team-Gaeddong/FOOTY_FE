import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  NO_MOVES,
  applyMoves,
  buildTeamsRequest,
  canEditLineup,
  countChanges,
  findEmptyTeams,
  movePlayer,
  previewTotalSkill,
  saveErrorOf,
  toTeamLabel,
} from './lineupEdit.js'

function member(gamePlayerId, skillLevel, isSubstitute = false) {
  return { gamePlayerId, name: `선수${gamePlayerId}`, skillLevel, position: 'MF', isSubstitute }
}

// A팀: 선수1(9), 선수2(6), 선수5(3, 후보) / B팀: 선수3(8), 선수4(4)
function teams() {
  return [
    { teamId: 100, name: 'A팀', totalSkill: 15, members: [member(1, 9), member(2, 6), member(5, 3, true)] },
    { teamId: 101, name: 'B팀', totalSkill: 12, members: [member(3, 8), member(4, 4)] },
  ]
}

function ids(team) {
  return team.members.map((item) => item.gamePlayerId)
}

test('선수를 다른 팀으로 옮기면 옮긴 기록이 남는다', () => {
  assert.deepEqual(movePlayer(teams(), NO_MOVES, 1, 101), { 1: 101 })
  assert.deepEqual(movePlayer(teams(), { 1: 101 }, 3, 100), { 1: 101, 3: 100 })
})

test('처음 팀으로 되돌리면 옮긴 기록이 지워진다', () => {
  assert.deepEqual(movePlayer(teams(), { 1: 101 }, 1, 100), {})
})

test('같은 팀으로 옮기거나 모르는 선수·팀이면 그대로다', () => {
  const moves = { 1: 101 }
  assert.equal(movePlayer(teams(), moves, 2, 100), moves)
  assert.equal(movePlayer(teams(), moves, 99, 100), moves)
  assert.equal(movePlayer(teams(), moves, 2, 999), moves)
})

test('옮기는 함수는 받은 값을 바꾸지 않는다', () => {
  const moves = Object.freeze({ 1: 101 })
  const next = movePlayer(teams(), moves, 3, 100)
  assert.notEqual(next, moves)
  assert.deepEqual(moves, { 1: 101 })
})

test('옮긴 결과를 팀 목록에 반영하고 옮겨 온 선수 앞 팀을 표시한다', () => {
  const result = applyMoves(teams(), { 1: 101, 3: 100 })
  assert.deepEqual(ids(result[0]), [2, 5, 3])
  assert.deepEqual(ids(result[1]), [4, 1])
  assert.equal(result[0].members[2].movedFrom, 101)
  assert.equal(result[1].members[1].movedFrom, 100)
  assert.equal(result[0].members[0].movedFrom, undefined)
  assert.equal(result[0].teamId, 100)
  assert.equal(result[0].name, 'A팀')
})

test('옮기지 않으면 팀 구성이 그대로다', () => {
  const original = teams()
  const result = applyMoves(original, NO_MOVES)
  assert.deepEqual(result, original)
})

test('원본 팀 목록은 바뀌지 않고 모르는 팀으로 향한 기록은 무시한다', () => {
  const original = teams()
  applyMoves(original, { 1: 101 })
  assert.deepEqual(ids(original[0]), [1, 2, 5])
  const result = applyMoves(original, { 1: 999 })
  assert.deepEqual(ids(result[0]), [1, 2, 5])
  assert.equal(countChanges(original, { 1: 999 }), 0)
})

test('처음과 다른 팀에 있는 선수 수를 센다', () => {
  assert.equal(countChanges(teams(), NO_MOVES), 0)
  assert.equal(countChanges(teams(), { 1: 101 }), 1)
  assert.equal(countChanges(teams(), { 1: 101, 3: 100, 5: 101 }), 3)
  // 처음 팀을 가리키는 기록과 목록에 없는 선수는 세지 않는다
  assert.equal(countChanges(teams(), { 1: 100, 99: 101 }), 0)
})

test('요청 본문은 라인업의 모든 팀을 한 번씩 담고 선수는 옮긴 결과다', () => {
  assert.deepEqual(buildTeamsRequest(teams(), { 1: 101, 3: 100 }), [
    { teamId: 100, gamePlayerIds: [2, 5, 3] },
    { teamId: 101, gamePlayerIds: [4, 1] },
  ])
})

test('옮기지 않아도 모든 선수를 담아 보낸다', () => {
  assert.deepEqual(buildTeamsRequest(teams(), NO_MOVES), [
    { teamId: 100, gamePlayerIds: [1, 2, 5] },
    { teamId: 101, gamePlayerIds: [3, 4] },
  ])
})

test('선수가 한 명도 없는 팀을 찾는다', () => {
  assert.deepEqual(findEmptyTeams(teams(), NO_MOVES), [])
  assert.deepEqual(findEmptyTeams(teams(), { 3: 100 }).map((team) => team.name), [])
  const result = findEmptyTeams(teams(), { 3: 100, 4: 100 })
  assert.deepEqual(result.map((team) => team.name), ['B팀'])
  assert.deepEqual(buildTeamsRequest(teams(), { 3: 100, 4: 100 })[1].gamePlayerIds, [])
})

test('예상 실력 합계는 후보를 뺀 선발의 합이다', () => {
  const result = applyMoves(teams(), { 1: 101, 3: 100 })
  // A: 선수2(6) + 선수3(8) (후보 선수5 제외), B: 선수4(4) + 선수1(9)
  assert.equal(previewTotalSkill(result[0].members), 14)
  assert.equal(previewTotalSkill(result[1].members), 13)
  assert.equal(previewTotalSkill([]), 0)
  assert.equal(previewTotalSkill([member(5, 3, true)]), 0)
})

test('선발 중 실력을 모르는 선수가 있으면 예상 합계를 내지 않는다', () => {
  assert.equal(previewTotalSkill([member(1, 9), member(2, null)]), null)
  // 후보의 실력은 합계에 쓰이지 않아 몰라도 된다
  assert.equal(previewTotalSkill([member(1, 9), member(2, null, true)]), 9)
})

test('수정 모드는 파티장이 팀 확정 전 모집 중 경기에서만 연다', () => {
  const lineup = { isConfirmed: false }
  assert.equal(canEditLineup({ lineup, isHost: true, gameStatus: 'RECRUITING', locked: false }), true)
  // 경기 상태를 모르면 BE 응답에 맡긴다
  assert.equal(canEditLineup({ lineup, isHost: true, gameStatus: undefined, locked: false }), true)
  assert.equal(canEditLineup({ lineup, isHost: true, gameStatus: null, locked: false }), true)
})

test('파티장이 아니거나 확인하지 못했으면 수정 모드를 열지 않는다', () => {
  const lineup = { isConfirmed: false }
  assert.equal(canEditLineup({ lineup, isHost: false, gameStatus: 'RECRUITING', locked: false }), false)
  assert.equal(canEditLineup({ lineup, isHost: null, gameStatus: 'RECRUITING', locked: false }), false)
})

test('팀 확정 뒤·모집 중이 아님·잠김·라인업 없음이면 수정 모드를 열지 않는다', () => {
  assert.equal(canEditLineup({ lineup: { isConfirmed: true }, isHost: true, gameStatus: 'CONFIRMED', locked: false }), false)
  assert.equal(canEditLineup({ lineup: { isConfirmed: false }, isHost: true, gameStatus: 'CONFIRMED', locked: false }), false)
  assert.equal(canEditLineup({ lineup: { isConfirmed: false }, isHost: true, gameStatus: 'FINISHED', locked: false }), false)
  assert.equal(canEditLineup({ lineup: { isConfirmed: false }, isHost: true, gameStatus: 'RECRUITING', locked: true }), false)
  assert.equal(canEditLineup({ lineup: null, isHost: true, gameStatus: 'RECRUITING', locked: false }), false)
})

test('받침에 맞춰 팀 이름 뒤에 "으로"나 "로"를 붙인다', () => {
  assert.equal(toTeamLabel('A팀'), 'A팀으로')
  assert.equal(toTeamLabel('B팀'), 'B팀으로')
  assert.equal(toTeamLabel('레드'), '레드로')
  assert.equal(toTeamLabel('블루'), '블루로')
  assert.equal(toTeamLabel('불'), '불로')
  assert.equal(toTeamLabel('흰색'), '흰색으로')
  assert.equal(toTeamLabel('Team A'), 'Team A으로')
})

function apiError(status, code, message = 'BE가 준 문구') {
  return { status, code, message }
}

test('저장 실패 문구는 BE message가 아니라 code로 고른다', () => {
  const message = saveErrorOf(apiError(403, 'GAME_403_1', '서버가 준 다른 문구')).message
  assert.equal(message, '파티장만 팀을 고칠 수 있어요.')
  assert.ok(!message.includes('서버가 준'))
})

test('파티장이 아니거나 경기가 없거나 모집 중이 아니면 수정을 잠근다', () => {
  assert.equal(saveErrorOf(apiError(403, 'GAME_403_1')).lock, true)
  assert.equal(saveErrorOf(apiError(404, 'GAME_404_1')).lock, true)
  assert.equal(saveErrorOf(apiError(409, 'GAME_409_1')).lock, true)
  assert.equal(saveErrorOf(apiError(404, 'LINEUP_404_2')).lock, true)
  assert.equal(saveErrorOf(apiError(403, 'GAME_403_1')).reload, undefined)
})

test('팀이 확정됐으면 수정을 잠그고 최신 라인업을 다시 불러온다', () => {
  const failure = saveErrorOf(apiError(409, 'LINEUP_409_4'))
  assert.equal(failure.lock, true)
  assert.equal(failure.reload, true)
  assert.equal(failure.confirmed, true)
  assert.match(failure.message, /확정/)
})

test('선수 구성이 맞지 않는 400은 최신 라인업을 다시 불러오고 잠그지는 않는다', () => {
  for (const code of ['LINEUP_400_1', 'LINEUP_400_2', 'LINEUP_400_3', 'LINEUP_400_4']) {
    const failure = saveErrorOf(apiError(400, code))
    assert.equal(failure.reload, true, code)
    assert.equal(failure.lock, undefined, code)
  }
})

test('빈 팀 400과 형식 오류 400은 옮긴 내용을 지키고 다시 시도할 수 있다', () => {
  const empty = saveErrorOf(apiError(400, 'LINEUP_400_5'))
  assert.match(empty.message, /1명 이상/)
  assert.equal(empty.reload, undefined)
  assert.equal(empty.lock, undefined)
  const invalid = saveErrorOf(apiError(400, 'GLOBAL_400_1'))
  assert.equal(invalid.reload, undefined)
  assert.equal(invalid.lock, undefined)
})

test('네트워크 오류·로그인 필요·온보딩 미완료·기타 오류', () => {
  assert.match(saveErrorOf(apiError(0, null, '')).message, /서버에 연결할 수 없/)
  assert.match(saveErrorOf(apiError(401, 'GLOBAL_401_1')).message, /로그인이 필요/)
  assert.match(saveErrorOf(apiError(403, 'MEMBER_403_1')).message, /온보딩/)
  assert.match(saveErrorOf(apiError(500, 'GLOBAL_500_1')).message, /저장하지 못했습니다/)
  assert.match(saveErrorOf(apiError(502, null, '')).message, /저장하지 못했습니다/)
  assert.match(saveErrorOf(new Error('x')).message, /저장하지 못했습니다/)
  assert.match(saveErrorOf(undefined).message, /저장하지 못했습니다/)
})

test('회원을 찾을 수 없으면 로그인 화면으로 보낸다', () => {
  assert.equal(saveErrorOf(apiError(404, 'MEMBER_404_1')).logout, true)
  assert.equal(saveErrorOf(apiError(403, 'GAME_403_1')).logout, undefined)
})
