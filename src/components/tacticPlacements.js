import { formationSlots } from './formations.js'
import { percentDistance, roundPercent } from './pitchCoords.js'

// 전술 배치도의 배치 상태를 다루는 순수 함수.
// 배치 하나는 { gamePlayerId, slot, x, y }다. slot은 포메이션 슬롯 번호(없으면 null)이고
// x·y는 실제 위치(퍼센트)라 슬롯에서 조금 옮겨도(미세 조정) 슬롯은 그대로 유지한다.
// BE는 좌표만 저장하므로(BE D-23) slot은 화면 안에서만 쓴다.

export const MAX_PLACEMENTS = 11 // BE UpdateTacticRequest @Size(max = 11)
const SNAP_DISTANCE = 6 // 이 거리(퍼센트) 안에 빈 슬롯이 있으면 그 슬롯에 붙인다

function nearestFreeSlot(slots, point, used) {
  let nearest = null
  let nearestDistance = SNAP_DISTANCE
  slots.forEach((slot, index) => {
    if (used.has(index)) return
    const distance = percentDistance(slot, point)
    if (distance <= nearestDistance) {
      nearest = index
      nearestDistance = distance
    }
  })
  return nearest
}

function usedSlots(placements, exceptPlayerId) {
  return new Set(
    placements
      .filter((placement) => placement.gamePlayerId !== exceptPlayerId && placement.slot !== null)
      .map((placement) => placement.slot),
  )
}

// BE 응답(TacticResponse.members)에서 배치된 선수만 꺼내고, 가까운 슬롯을 찾아 붙인다.
export function placementsFromMembers(members, formation) {
  const slots = formationSlots(formation)
  const used = new Set()
  return members
    .filter((member) => member.posX !== null && member.posY !== null)
    .map((member) => {
      const point = { x: Number(member.posX), y: Number(member.posY) }
      const slot = nearestFreeSlot(slots, point, used)
      if (slot !== null) used.add(slot)
      return { gamePlayerId: member.gamePlayerId, slot, ...point }
    })
}

export function freeSlotIndexes(placements, formation) {
  const used = usedSlots(placements)
  return formationSlots(formation)
    .map((_, index) => index)
    .filter((index) => !used.has(index))
}

export function isFull(placements) {
  return placements.length >= MAX_PLACEMENTS
}

// 선수를 target으로 옮긴 새 배열을 돌려준다. 바뀌지 않으면 같은 배열을 돌려준다.
// target: { type: 'out' } 배치 해제
//         { type: 'player', gamePlayerId } 그 선수와 자리 교체(벤치에서 오면 그 선수는 벤치로)
//         { type: 'slot', index } 빈 슬롯에 놓기
//         { type: 'point', x, y } 경기장의 그 위치에 놓기(가까운 빈 슬롯이 있으면 붙인다)
export function movePlayer(placements, gamePlayerId, target, formation) {
  const current = placements.find((placement) => placement.gamePlayerId === gamePlayerId)

  if (target.type === 'out') {
    return current
      ? placements.filter((placement) => placement !== current)
      : placements
  }

  if (target.type === 'player') {
    const other = placements.find((placement) => placement.gamePlayerId === target.gamePlayerId)
    if (!other || other === current) return placements
    if (!current) {
      return placements.map((placement) =>
        placement === other ? { ...other, gamePlayerId } : placement,
      )
    }
    return placements.map((placement) => {
      if (placement === current) return { ...other, gamePlayerId }
      if (placement === other) return { ...current, gamePlayerId: other.gamePlayerId }
      return placement
    })
  }

  if (!current && isFull(placements)) return placements

  const slots = formationSlots(formation)
  let next
  if (target.type === 'slot') {
    const slot = slots[target.index]
    if (!slot || usedSlots(placements, gamePlayerId).has(target.index)) return placements
    next = { gamePlayerId, slot: target.index, x: slot.x, y: slot.y }
  } else {
    const point = { x: roundPercent(target.x), y: roundPercent(target.y) }
    const snapped = nearestFreeSlot(slots, point, usedSlots(placements, gamePlayerId))
    if (snapped !== null) {
      next = { gamePlayerId, slot: snapped, x: slots[snapped].x, y: slots[snapped].y }
    } else {
      next = { gamePlayerId, slot: current?.slot ?? null, ...point }
    }
  }

  return current
    ? placements.map((placement) => (placement === current ? next : placement))
    : [...placements, next]
}

// 포메이션을 바꾸면 슬롯에 있던 선수는 새 포메이션의 같은 번호 슬롯으로 옮긴다.
export function changeFormation(placements, formation) {
  const slots = formationSlots(formation)
  return placements.map((placement) => {
    const slot = placement.slot === null ? undefined : slots[placement.slot]
    if (!slot) return { ...placement, slot: null }
    return { ...placement, x: slot.x, y: slot.y }
  })
}

// PUT /games/{gameId}/teams/{teamId}/tactic 의 placements 형식
export function toPlacementRequest(placements) {
  return placements.map(({ gamePlayerId, x, y }) => ({
    gamePlayerId,
    posX: roundPercent(x),
    posY: roundPercent(y),
  }))
}
