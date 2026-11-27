import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canCancelConfirm,
  canFinish,
  finishErrorMessage,
  isNoLineup,
  lineupErrorMessage,
  lineupNote,
  squadNoteFromCounts,
  pitchMarkers,
  squadSummary,
  teamRows,
  teamStatusView,
} from './lineupView.js'

const member = (id, name, position, isSubstitute = false, skillLevel = null) => ({
  gamePlayerId: id, name, position, isSubstitute, skillLevel,
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

test('팀 탭 상태: 팀이 없으면 null, 확정 전은 임시 팀, 확정 뒤는 확정된 팀이다', () => {
  assert.equal(teamStatusView({ lineup: null, isHost: true }), null)

  const draft = teamStatusView({ lineup: { isConfirmed: false }, isHost: true })
  assert.equal(draft.stage, 'draft')
  assert.equal(draft.badge, '임시')
  assert.equal(draft.tone, 'red')
  assert.equal(draft.title, '임시 팀 · 조정 중')
  assert.match(draft.description, /참가자에게도 임시 팀으로 보여요/)

  const confirmed = teamStatusView({ lineup: { isConfirmed: true }, isHost: true, status: 'CONFIRMED' })
  assert.equal(confirmed.stage, 'confirmed')
  assert.equal(confirmed.badge, '확정')
  assert.equal(confirmed.tone, 'navy')
  assert.equal(confirmed.title, '확정된 팀')
  assert.match(confirmed.description, /경기를 마쳤으면 종료해 주세요/)
})

test('참가자에게도 임시 팀은 임시라고 보여 주고, 파티장 전용 안내는 뺀다', () => {
  const draft = teamStatusView({ lineup: { isConfirmed: false }, isHost: false })
  assert.equal(draft.title, '임시 팀 · 조정 중')
  assert.doesNotMatch(draft.description, /확정해 주세요/)
  const confirmed = teamStatusView({ lineup: { isConfirmed: true }, isHost: false, status: 'CONFIRMED' })
  assert.doesNotMatch(confirmed.description, /종료해 주세요/)
})

test('확정 취소 안내는 버튼이 보이는 파티장(팀 확정 경기)에게만 쓴다', () => {
  const host = teamStatusView({ lineup: { isConfirmed: true }, isHost: true, status: 'CONFIRMED' })
  assert.match(host.description, /확정을 취소하고, 경기를 마쳤으면 종료해 주세요/)
  // 이미 종료된 경기의 파티장, 참가자, 임시 팀에는 취소 안내가 없다
  assert.doesNotMatch(teamStatusView({ lineup: { isConfirmed: true }, isHost: true, status: 'FINISHED' }).description, /취소/)
  assert.doesNotMatch(teamStatusView({ lineup: { isConfirmed: true }, isHost: false, status: 'CONFIRMED' }).description, /취소/)
  assert.doesNotMatch(teamStatusView({ lineup: { isConfirmed: false }, isHost: true, status: 'RECRUITING' }).description, /취소/)
})

test('확정 취소 버튼은 팀이 확정된 경기의 파티장에게만 보인다', () => {
  assert.equal(canCancelConfirm({ isHost: true, status: 'CONFIRMED' }), true)
  assert.equal(canCancelConfirm({ isHost: true, status: 'RECRUITING' }), false)
  assert.equal(canCancelConfirm({ isHost: true, status: 'FINISHED' }), false)
  assert.equal(canCancelConfirm({ isHost: false, status: 'CONFIRMED' }), false)
})

test('경기 종료 버튼은 팀이 확정된 경기의 파티장에게만 보인다', () => {
  assert.equal(canFinish({ isHost: true, status: 'CONFIRMED' }), true)
  assert.equal(canFinish({ isHost: true, status: 'RECRUITING' }), false)
  assert.equal(canFinish({ isHost: true, status: 'FINISHED' }), false)
  assert.equal(canFinish({ isHost: false, status: 'CONFIRMED' }), false)
})

test('불러오기 실패 안내에는 "라인업"이라는 말을 쓰지 않는다', () => {
  assert.doesNotMatch(lineupErrorMessage({ status: 500 }), /라인업/)
  assert.match(lineupErrorMessage({ status: 500 }), /팀 구성을 불러오지 못했습니다/)
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

test('선발·후보 안내는 후보가 없으면 "후보 없음", 인원 수로도 만든다', () => {
  assert.equal(lineupNote({ teams: [{ members: [{ isSubstitute: false }, { isSubstitute: false }] }] }), '선발 2명 · 후보 없음')
  assert.equal(squadNoteFromCounts(22, 22), '선발 22명 · 후보 없음')
  assert.equal(squadNoteFromCounts(24, 22), '선발 22명 · 후보 2명')
  assert.equal(squadNoteFromCounts(10, 22), '선발 10명 · 후보 없음')
})
