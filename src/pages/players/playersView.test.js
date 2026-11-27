import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INVALID_POSITIONS,
  SKILL_START,
  accessMode,
  loadErrorMessage,
  positionSaveError,
  ratedRatio,
  saveButtonLabel,
  skillSaveError,
  stepSkill,
} from './playersView.js'

test('점수가 없을 때 +는 가운데에서 시작하고 −는 아무것도 하지 않는다', () => {
  assert.equal(stepSkill(null, 1), SKILL_START)
  assert.equal(stepSkill(undefined, 1), SKILL_START)
  assert.equal(stepSkill(null, -1), null)
})

test('점수는 1~10 안에서만 움직인다', () => {
  assert.equal(stepSkill(7, 1), 8)
  assert.equal(stepSkill(7, -1), 6)
  assert.equal(stepSkill(10, 1), 10)
  assert.equal(stepSkill(1, -1), 1)
})

test('파티장이 아니면 막고, 모집 중이면 실력·포지션, 모집이 끝나면 실력만 고친다', () => {
  assert.equal(accessMode({ isHost: false, status: 'RECRUITING' }), 'forbidden')
  assert.equal(accessMode({ isHost: true, status: 'RECRUITING' }), 'edit')
  assert.equal(accessMode({ isHost: true, status: 'CONFIRMED' }), 'scores')
  assert.equal(accessMode({ isHost: true, status: 'FINISHED' }), 'scores')
})

test('진행 막대 비율은 0~1이다', () => {
  assert.equal(ratedRatio(21, 24), 0.875)
  assert.equal(ratedRatio(0, 0), 0)
  assert.equal(ratedRatio(30, 24), 1)
})

test('불러오기 실패 안내는 상태 코드와 code로 고른다', () => {
  assert.match(loadErrorMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.match(loadErrorMessage({ code: 'GAME_404_1' }), /없거나 삭제/)
  assert.match(loadErrorMessage({ code: 'MEMBER_403_1' }), /온보딩/)
  assert.match(loadErrorMessage({ status: 401 }), /로그인이 필요/)
  assert.match(loadErrorMessage({ status: 500, message: '서버 문구' }), /불러오지 못했습니다/)
  assert.doesNotMatch(loadErrorMessage({ status: 500, message: '서버 문구' }), /서버 문구/)
})

test('실력 저장 실패: 파티장 아님·경기 없음은 잠그고, 선수 변경은 다시 불러오게 한다', () => {
  assert.deepEqual(skillSaveError({ code: 'GAME_403_1' }), { message: '파티장만 실력을 매길 수 있어요.', lock: true })
  assert.equal(skillSaveError({ code: 'GAME_404_1' }).lock, true)
  assert.equal(skillSaveError({ code: 'GAME_404_2' }).reload, true)
  assert.match(skillSaveError({ code: 'GAME_400_1' }).message, /1~10/)
  assert.equal(skillSaveError({ status: 500 }).lock, undefined)
})

test('포지션 저장 실패: 모집이 끝난 경우는 포지션만 잠근다', () => {
  const closed = positionSaveError({ code: 'GAME_409_1' })
  assert.equal(closed.lock, true)
  assert.equal(closed.positionsOnly, true)
  assert.equal(positionSaveError({ code: 'GAME_403_1' }).positionsOnly, undefined)
  assert.equal(positionSaveError({ code: 'MEMBER_400_2' }).message, INVALID_POSITIONS)
  assert.equal(positionSaveError({ code: 'GAME_404_2' }).reload, true)
})

test('저장 버튼 문구는 저장 중·바꾼 선수 수를 보여 준다', () => {
  assert.equal(saveButtonLabel({ saving: true, count: 3 }), '저장하는 중…')
  assert.equal(saveButtonLabel({ saving: false, count: 0 }), '실력 저장')
  assert.equal(saveButtonLabel({ saving: false, count: 3 }), '실력 저장')
  assert.equal(saveButtonLabel({ saving: false, count: 3, compact: true }), '실력 저장 · 3명')
})
