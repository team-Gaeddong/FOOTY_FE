import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  SKILL_OPTIONS,
  applySkillLevels,
  changedSkillLevels,
  countUnrated,
  effectiveSkill,
} from './skillLevels.js'

const players = [
  { id: 1, name: '가', skillLevel: 5 },
  { id: 2, name: '나', skillLevel: null },
  { id: 3, name: '다', skillLevel: 8 },
]

test('실력 선택지는 1부터 10까지', () => {
  assert.deepEqual(SKILL_OPTIONS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test('고친 값이 있으면 그 값을, 없으면 저장된 값을 쓴다', () => {
  assert.equal(effectiveSkill(players[0], { 1: 7 }), 7)
  assert.equal(effectiveSkill(players[0], {}), 5)
  assert.equal(effectiveSkill(players[1], {}), null)
})

test('저장된 값과 다른 선수만 요청에 담는다', () => {
  assert.deepEqual(changedSkillLevels(players, { 1: 5, 2: 3, 3: 9 }), [
    { gamePlayerId: 2, skillLevel: 3 },
    { gamePlayerId: 3, skillLevel: 9 },
  ])
  assert.deepEqual(changedSkillLevels(players, {}), [])
  assert.deepEqual(changedSkillLevels(players, { 1: 5 }), [])
})

test('목록에 없는 선수의 고친 값은 보내지 않는다', () => {
  assert.deepEqual(changedSkillLevels(players, { 99: 4 }), [])
})

test('고친 값을 반영해 미입력 선수 수를 센다', () => {
  assert.equal(countUnrated(players, {}), 1)
  assert.equal(countUnrated(players, { 2: 6 }), 0)
})

test('저장한 값만 목록에 반영한다', () => {
  const next = applySkillLevels(players, [{ gamePlayerId: 2, skillLevel: 4 }])
  assert.deepEqual(next.map((player) => player.skillLevel), [5, 4, 8])
  assert.equal(next[0], players[0])
})
