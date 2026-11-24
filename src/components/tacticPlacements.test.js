import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FORMATIONS } from './formations.js'
import {
  MAX_PLACEMENTS,
  autoPlace,
  changeFormation,
  freeSlotIndexes,
  liftTarget,
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

// 팀 구성 1 GK, 4 DF, 4 MF, 2 FW. id는 포지션 순서대로 1부터 매긴다.
const squad = (positions, substitutes = []) =>
  positions.map((position, index) => ({
    gamePlayerId: index + 1,
    position,
    isSubstitute: substitutes.includes(index + 1),
  }))
const FULL = ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW']

test('자동 배치는 선수를 같은 포지션의 슬롯 좌표에 놓는다', () => {
  const placed = autoPlace(squad(FULL), F)
  assert.equal(placed.length, 11)
  placed.forEach((placement) => {
    const slot = FORMATIONS[F][placement.slot]
    assert.equal(slot.role, FULL[placement.gamePlayerId - 1])
    assert.deepEqual([placement.x, placement.y], [slot.x, slot.y])
  })
  assert.equal(new Set(placed.map((placement) => placement.slot)).size, 11)
})

test('자동 배치는 섞인 순서로 와도 포지션에 맞춰 놓고, 같은 포지션은 먼저 온 선수가 앞 슬롯을 받는다', () => {
  const members = squad(['FW', 'MF', 'DF', 'GK', 'DF', 'MF', 'FW', 'DF', 'MF', 'DF', 'MF'])
  const placed = autoPlace(members, F)
  assert.equal(placed.length, 11)
  assert.equal(FORMATIONS[F][placed.find((p) => p.gamePlayerId === 4).slot].role, 'GK')
  const defenders = placed.filter((p) => members[p.gamePlayerId - 1].position === 'DF')
  assert.deepEqual(defenders.map((p) => p.gamePlayerId), [3, 5, 8, 10])
  assert.deepEqual(defenders.map((p) => p.slot), [1, 2, 3, 4])
})

test('자동 배치는 후보를 놓지 않는다', () => {
  const placed = autoPlace(squad([...FULL, 'MF'], [12]), F)
  assert.equal(placed.length, 11)
  assert.equal(ids(placed).includes(12), false)
  const fewer = autoPlace(squad(['GK', 'DF', 'MF'], [3]), F)
  assert.deepEqual(ids(fewer), [1, 2])
})

test('자동 배치는 포지션이 모자라면 가까운 포지션의 선수로 슬롯을 채운다', () => {
  const noKeeper = squad(['DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW'])
  const placed = autoPlace(noKeeper, F)
  assert.equal(placed.length, 11)
  const goalkeeper = placed.find((p) => FORMATIONS[F][p.slot].role === 'GK')
  assert.equal(noKeeper[goalkeeper.gamePlayerId - 1].position, 'DF')
  assert.equal(goalkeeper.gamePlayerId, 5)
})

test('자동 배치는 11명을 넘지 않고 선수가 적으면 그만큼만 놓는다', () => {
  const many = squad([...FULL, 'DF', 'MF', 'FW', 'GK'])
  assert.equal(autoPlace(many, F).length, MAX_PLACEMENTS)
  assert.equal(autoPlace(squad(['GK', 'DF', 'MF']), F).length, 3)
  assert.deepEqual(autoPlace([], F), [])
})

test('자동 배치 결과는 같은 선수·같은 슬롯이 겹치지 않고 다른 포메이션에서도 슬롯을 따른다', () => {
  const placed = autoPlace(squad(FULL), '4-3-3')
  assert.equal(placed.length, 11)
  assert.equal(new Set(ids(placed)).size, 11)
  assert.equal(new Set(placed.map((p) => p.slot)).size, 11)
  placed.forEach((p) => {
    const slot = FORMATIONS['4-3-3'][p.slot]
    assert.deepEqual([p.x, p.y], [slot.x, slot.y])
  })
  assert.deepEqual(autoPlace(squad(FULL), '5-4-1'), [])
})

test('벤치 선수는 같은 역할의 빈 슬롯에 올라가고, 없으면 첫 빈 슬롯에 올라간다', () => {
  const fw = { gamePlayerId: 9, position: 'FW' }
  assert.deepEqual(liftTarget(fw, [], F), { type: 'slot', index: 9 })
  // FW 슬롯(9·10번)을 모두 쓰면 첫 빈 슬롯(0번 GK)으로
  const taken = movePlayer(movePlayer([], 1, { type: 'slot', index: 9 }, F), 2, { type: 'slot', index: 10 }, F)
  assert.deepEqual(liftTarget(fw, taken, F), { type: 'slot', index: 0 })
})

test('11명이 이미 올라가 있으면 올릴 곳이 없다', () => {
  const full = Array.from({ length: MAX_PLACEMENTS }, (_, i) => ({ gamePlayerId: i + 1, slot: i, x: 50, y: 50 }))
  assert.equal(liftTarget({ gamePlayerId: 99, position: 'MF' }, full, F), null)
})

test('슬롯이 없는 포메이션이면 경기장 가운데에 올린다', () => {
  assert.deepEqual(liftTarget({ gamePlayerId: 1, position: 'MF' }, [], '5-3-2'), { type: 'point', x: 50, y: 50 })
})
