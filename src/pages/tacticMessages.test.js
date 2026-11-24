import assert from 'node:assert/strict'
import { test } from 'node:test'
import { imageErrorMessage, loadErrorMessage, saveErrorOf } from './tacticMessages.js'

const api = (status, code) => ({ status, code, message: 'BE 문구' })

test('불러오기 실패는 code로 고르고 BE 문구를 쓰지 않는다', () => {
  assert.match(loadErrorMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(loadErrorMessage(api(404, 'GAME_404_1')), /경기가 없거나/)
  assert.match(loadErrorMessage(api(404, 'LINEUP_404_1')), /없는 팀/)
  assert.match(loadErrorMessage(api(403, 'MEMBER_403_1')), /온보딩/)
  assert.match(loadErrorMessage(api(500, 'GLOBAL_500_1')), /잠시 후 다시/)
  assert.doesNotMatch(loadErrorMessage(api(500)), /BE 문구/)
  assert.match(loadErrorMessage(new Error('boom')), /불러오지 못했습니다/)
})

test('저장해도 안 되는 실패는 편집을 잠그고, 다시 배치하면 되는 실패는 잠그지 않는다', () => {
  assert.equal(saveErrorOf(api(403, 'GAME_403_1')).lock, true)
  assert.equal(saveErrorOf(api(409, 'LINEUP_409_4')).lock, true)
  assert.equal(saveErrorOf(api(404, 'LINEUP_404_1')).lock, true)
  assert.equal(saveErrorOf(api(400, 'LINEUP_400_1')).lock, undefined)
  assert.equal(saveErrorOf(api(400, 'LINEUP_400_2')).lock, undefined)
  assert.match(saveErrorOf(api(400, 'GLOBAL_400_1')).message, /11명 이하/)
  assert.match(saveErrorOf(api(0)).message, /서버에 연결할 수 없습니다/)
  assert.match(saveErrorOf(api(500)).message, /잠시 후 다시/)
  assert.match(saveErrorOf(new Error('boom')).message, /다시 시도/)
})

test('이미지 저장 실패 안내', () => {
  assert.match(imageErrorMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(imageErrorMessage(api(404, 'GAME_404_1')), /경기나 팀이 없어져/)
  assert.match(imageErrorMessage(api(500)), /이미지를 만들지 못했어요/)
  assert.match(imageErrorMessage(new Error('x')), /다시 시도/)
})
