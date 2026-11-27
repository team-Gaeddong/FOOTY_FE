import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NICKNAME_MAX, NICKNAME_MIN, isValidNickname, nicknameLength } from './nickname.js'

test('길이는 앞뒤 공백을 뺀 코드 포인트 수다', () => {
  assert.equal(nicknameLength('  왼발장인  '), 4)
  assert.equal(nicknameLength('⚽골'), 2)
})

test('2~10자만 유효하다', () => {
  assert.equal(NICKNAME_MIN, 2)
  assert.equal(NICKNAME_MAX, 10)
  assert.equal(isValidNickname('가'), false)
  assert.equal(isValidNickname('가나'), true)
  assert.equal(isValidNickname('가나다라마바사아자차'), true)
  assert.equal(isValidNickname('가나다라마바사아자차카'), false)
})

test('공백만 있거나 공백을 빼면 모자라면 유효하지 않다', () => {
  assert.equal(isValidNickname('    '), false)
  assert.equal(isValidNickname(' 가 '), false)
})
