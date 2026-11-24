import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bannerKind,
  finishErrorMessage,
  isNoLineup,
  lineupErrorMessage,
  lineupNote,
  methodLabel,
  pitchMarkers,
  squadSummary,
  teamRows,
} from './lineupView.js'

const member = (id, name, position, isSubstitute = false, skillLevel = null) => ({
  gamePlayerId: id, name, position, isSubstitute, skillLevel,
})

test('편성 방식 칩은 자동·직접으로 나뉜다', () => {
  assert.equal(methodLabel('ALGORITHM'), '자동 편성')
  assert.equal(methodLabel('AI'), '자동 편성')
  assert.equal(methodLabel('MANUAL'), '직접 편성')
  assert.equal(methodLabel('NEW'), '')
})

test('선발·후보 수는 모든 팀을 합쳐 센다', () => {
  const lineup = {
    teams: [
      { members: [member(1, 'a', 'GK'), member(2, 'b', 'DF'), member(3, 'c', 'FW', true)] },
      { members: [member(4, 'd', 'MF'), member(5, 'e', 'FW', true), member(6, 'f', 'DF', true)] },
    ],
  }
  assert.deepEqual(squadSummary(lineup), { starters: 3, substitutes: 3 })
  assert.equal(lineupNote(lineup), '선발 3명 · 후보 3명')
})

test('팀 선수 줄은 서버 순서를 지키되 후보를 뒤로 보내고 실력이 없으면 null이다', () => {
  const rows = teamRows({
    members: [member(1, 'a', 'GK', false, 9), member(2, 'b', 'DF', true, 3), member(3, 'c', 'FW', false)],
  })
  assert.deepEqual(rows.map((row) => row.id), [1, 3, 2])
  assert.equal(rows[1].skillLevel, null)
  assert.equal(rows[2].isSubstitute, true)
})

test('배치도에는 좌표가 있는 팀원만 퍼센트 그대로 그린다', () => {
  const markers = pitchMarkers({
    members: [
      { gamePlayerId: 1, name: 'a', position: 'GK', posX: '50.00', posY: 90 },
      { gamePlayerId: 2, name: 'b', position: 'DF', posX: null, posY: null },
      { gamePlayerId: 3, name: 'c', position: 'FW', posX: 0, posY: 0 },
    ],
  })
  assert.deepEqual(markers.map((marker) => [marker.id, marker.x, marker.y]), [[1, 50, 90], [3, 0, 0]])
  assert.deepEqual(pitchMarkers(null), [])
})

test('위쪽 안내 줄은 파티장에게만, 팀 확정이면 종료, 모집 중이면 팀 짜기 화면 안내다', () => {
  assert.equal(bannerKind({ isHost: true, status: 'CONFIRMED' }), 'finish')
  assert.equal(bannerKind({ isHost: true, status: 'RECRUITING' }), 'edit')
  assert.equal(bannerKind({ isHost: true, status: 'FINISHED' }), null)
  assert.equal(bannerKind({ isHost: false, status: 'CONFIRMED' }), null)
})

test('경기 종료 실패 안내는 code로 고르고 BE message를 쓰지 않는다', () => {
  assert.match(finishErrorMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.match(finishErrorMessage({ code: 'GAME_403_1' }), /파티장만/)
  assert.match(finishErrorMessage({ code: 'GAME_404_1' }), /찾을 수 없어요/)
  assert.match(finishErrorMessage({ code: 'GAME_409_4' }), /팀이 확정된 경기만/)
  assert.match(finishErrorMessage({ code: 'X', message: '서버 문구' }), /종료하지 못했습니다/)
  assert.doesNotMatch(finishErrorMessage({ code: 'X', message: '서버 문구' }), /서버 문구/)
})

test('팀이 없는 경우는 오류가 아니라 빈 상태이고 나머지 실패는 안내 문구가 있다', () => {
  assert.equal(isNoLineup({ code: 'LINEUP_404_2' }), true)
  assert.equal(isNoLineup({ code: 'GAME_404_1' }), false)
  assert.match(lineupErrorMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.match(lineupErrorMessage({ code: 'MEMBER_403_1' }), /온보딩/)
  assert.match(lineupErrorMessage({ status: 500 }), /불러오지 못했습니다/)
})
