import assert from 'node:assert/strict'
import { test } from 'node:test'
import { avatarInitial } from './avatarInitial.js'

test('이름의 첫 글자를 돌려준다', () => {
  assert.equal(avatarInitial('왼발장인'), '왼')
  assert.equal(avatarInitial('Kim'), 'K')
})

test('영문 소문자는 대문자로 바꾼다', () => {
  assert.equal(avatarInitial('footy'), 'F')
})

test('앞뒤 공백은 무시한다', () => {
  assert.equal(avatarInitial('  태균 '), '태')
})

test('이모지처럼 두 단위로 된 글자도 한 글자로 센다', () => {
  assert.equal(avatarInitial('⚽골잡이'), '⚽')
  assert.equal(avatarInitial('😀x'), '😀')
})

test('이름이 없거나 공백뿐이면 물음표를 돌려준다', () => {
  assert.equal(avatarInitial(''), '?')
  assert.equal(avatarInitial('   '), '?')
  assert.equal(avatarInitial(null), '?')
  assert.equal(avatarInitial(undefined), '?')
})
