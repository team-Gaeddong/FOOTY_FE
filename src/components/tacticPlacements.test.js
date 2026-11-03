import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FORMATIONS } from './formations.js'
import {
  MAX_PLACEMENTS,
  changeFormation,
  freeSlotIndexes,
  movePlayer,
  placementsFromMembers,
  toPlacementRequest,
} from './tacticPlacements.js'

const F = '4-4-2'
const ids = (placements) => placements.map((placement) => placement.gamePlayerId)

test('미배치 선수를 빈 슬롯에 놓으면 슬롯 좌표로 배치된다', () => {
  const next = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  assert.deepEqual(next, [{ gamePlayerId: 1, slot: 0, x: 50, y: 90 }])
})

test('슬롯 근처에 놓으면 그 슬롯에 붙고, 멀면 놓은 자리에 둔다', () => {
  const snapped = movePlayer([], 1, { type: 'point', x: 16, y: 71 }, F)
  assert.deepEqual(snapped, [{ gamePlayerId: 1, slot: 1, x: 15, y: 70 }])
  const free = movePlayer([], 1, { type: 'point', x: 5.555, y: 5 }, F)
  assert.deepEqual(free, [{ gamePlayerId: 1, slot: null, x: 5.56, y: 5 }])
})

test('배치된 선수를 끌어 미세 조정하면 위치만 바뀌고 슬롯은 유지된다', () => {
  const placed = movePlayer([], 1, { type: 'slot', index: 1 }, F)
  const next = movePlayer(placed, 1, { type: 'point', x: 30, y: 60 }, F)
  assert.deepEqual(next, [{ gamePlayerId: 1, slot: 1, x: 30, y: 60 }])
})

test('배치된 두 선수는 서로 자리를 바꾼다(swap)', () => {
  let placements = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  placements = movePlayer(placements, 2, { type: 'slot', index: 9 }, F)
  const next = movePlayer(placements, 1, { type: 'player', gamePlayerId: 2 }, F)
  assert.deepEqual(next, [
    { gamePlayerId: 1, slot: 9, x: 38, y: 22 },
    { gamePlayerId: 2, slot: 0, x: 50, y: 90 },
  ])
})

test('미배치 선수를 배치된 선수에게 놓으면 자리를 넘겨받고 기존 선수는 해제된다', () => {
  const placements = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  const next = movePlayer(placements, 3, { type: 'player', gamePlayerId: 1 }, F)
  assert.deepEqual(next, [{ gamePlayerId: 3, slot: 0, x: 50, y: 90 }])
})

test('배치 해제하면 목록에서 빠지고 슬롯이 다시 빈다', () => {
  const placements = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  const next = movePlayer(placements, 1, { type: 'out' }, F)
  assert.deepEqual(next, [])
  assert.ok(freeSlotIndexes(next, F).includes(0))
})

test('한 선수는 한 곳에만 배치된다(중복 불가)', () => {
  let placements = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  placements = movePlayer(placements, 1, { type: 'slot', index: 5 }, F)
  placements = movePlayer(placements, 1, { type: 'point', x: 80, y: 10 }, F)
  assert.deepEqual(ids(placements), [1])
  assert.equal(new Set(ids(toPlacementRequest(placements))).size, 1)
})

test('다른 선수가 있는 슬롯에는 슬롯 대상으로 놓을 수 없다', () => {
  const placements = movePlayer([], 1, { type: 'slot', index: 0 }, F)
  assert.equal(movePlayer(placements, 2, { type: 'slot', index: 0 }, F), placements)
})

test(`경기장에는 ${MAX_PLACEMENTS}명까지만 놓인다`, () => {
  let placements = []
  for (let index = 0; index < MAX_PLACEMENTS; index += 1) {
    placements = movePlayer(placements, 100 + index, { type: 'slot', index }, F)
  }
  assert.equal(placements.length, MAX_PLACEMENTS)
  assert.equal(movePlayer(placements, 999, { type: 'point', x: 1, y: 1 }, F), placements)
  // 꽉 차도 교체는 된다
  const swapped = movePlayer(placements, 999, { type: 'player', gamePlayerId: 100 }, F)
  assert.equal(swapped.length, MAX_PLACEMENTS)
  assert.ok(ids(swapped).includes(999))
})

test('포메이션을 바꾸면 슬롯 순서대로 새 좌표로 옮기고, 슬롯 밖 선수는 그대로 둔다', () => {
  let placements = movePlayer([], 1, { type: 'slot', index: 5 }, F)
  placements = movePlayer(placements, 2, { type: 'point', x: 3, y: 3 }, F)
  const next = changeFormation(placements, '4-3-3')
  assert.deepEqual(next[0], { gamePlayerId: 1, slot: 5, ...pick(FORMATIONS['4-3-3'][5]) })
  assert.deepEqual(next[1], { gamePlayerId: 2, slot: null, x: 3, y: 3 })
})

test('불러올 때는 좌표로 그리고, 배치 안 된 선수(null)는 빼고, 가까운 슬롯을 차지한다', () => {
  const placements = placementsFromMembers(
    [
      { gamePlayerId: 1, posX: 50, posY: 89.5 },
      { gamePlayerId: 2, posX: null, posY: null },
      { gamePlayerId: 3, posX: 3, posY: 3 },
    ],
    F,
  )
  assert.deepEqual(placements, [
    { gamePlayerId: 1, slot: 0, x: 50, y: 89.5 },
    { gamePlayerId: 3, slot: null, x: 3, y: 3 },
  ])
  assert.ok(!freeSlotIndexes(placements, F).includes(0))
})

test('저장 요청은 BE 형식(퍼센트 0~100, 소수 2자리)이다', () => {
  assert.deepEqual(
    toPlacementRequest([{ gamePlayerId: 1, slot: 0, x: 33.3333, y: 100.4 }]),
    [{ gamePlayerId: 1, posX: 33.33, posY: 100 }],
  )
})

function pick({ x, y }) {
  return { x, y }
}
