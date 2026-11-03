import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientToPercent, percentDistance, pitchPosition, roundPercent } from './pitchCoords.js'

const rect = { left: 100, top: 50, width: 200, height: 400 }

test('roundPercent는 소수 둘째 자리로 반올림한다', () => {
  assert.equal(roundPercent(33.33333), 33.33)
  assert.equal(roundPercent(12.345), 12.35)
  assert.equal(roundPercent(50), 50)
})

test('roundPercent는 0~100으로 자른다', () => {
  assert.equal(roundPercent(-3), 0)
  assert.equal(roundPercent(100.4), 100)
})

test('clientToPercent는 경기장 기준 퍼센트로 바꾼다(왼쪽 위가 0,0)', () => {
  assert.deepEqual(clientToPercent(100, 50, rect), { x: 0, y: 0 })
  assert.deepEqual(clientToPercent(200, 250, rect), { x: 50, y: 50 })
  assert.deepEqual(clientToPercent(300, 450, rect), { x: 100, y: 100 })
  assert.deepEqual(clientToPercent(166.666, 50, rect), { x: 33.33, y: 0 })
})

test('clientToPercent는 경기장 밖이면 null이다', () => {
  assert.equal(clientToPercent(99, 100, rect), null)
  assert.equal(clientToPercent(150, 451, rect), null)
})

test('같은 퍼센트는 경기장 크기가 달라도 같은 상대 위치다', () => {
  const small = { left: 0, top: 0, width: 340, height: 525 }
  const large = { left: 0, top: 0, width: 680, height: 1050 }
  assert.deepEqual(clientToPercent(85, 262.5, small), clientToPercent(170, 525, large))
})

test('pitchPosition과 percentDistance', () => {
  assert.deepEqual(pitchPosition({ x: 12.5, y: 80 }), { left: '12.5%', top: '80%' })
  assert.equal(percentDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
})
