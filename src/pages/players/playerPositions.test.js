import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyPositions, countWithoutPositions, samePositions } from './playerPositions.js'

const players = [
  { id: 1, name: '가', positions: ['MF', 'FW'] },
  { id: 2, name: '나', positions: [] },
]

test('포지션이 같아도 순서가 다르면 다른 값이다', () => {
  assert.equal(samePositions(['MF', 'FW'], ['MF', 'FW']), true)
  assert.equal(samePositions(['MF', 'FW'], ['FW', 'MF']), false)
  assert.equal(samePositions(['MF'], ['MF', 'FW']), false)
  assert.equal(samePositions([], []), true)
})

test('저장한 선수의 포지션만 바꾸고 원본은 그대로 둔다', () => {
  const picked = ['GK']
  const next = applyPositions(players, 2, picked)
  assert.deepEqual(next[1].positions, ['GK'])
  assert.equal(next[0], players[0])
  assert.deepEqual(players[1].positions, [])
  picked.push('DF')
  assert.deepEqual(next[1].positions, ['GK'])
})

test('포지션이 없는 선수 수를 센다', () => {
  assert.equal(countWithoutPositions(players), 1)
  assert.equal(countWithoutPositions([]), 0)
})
