// BE Position enum. 1~4개, 중복 없이 고르고 고른 순서가 우선순위다(BE D-13).
export const POSITIONS = [
  { value: 'GK', label: '골키퍼' },
  { value: 'DF', label: '수비수' },
  { value: 'MF', label: '미드필더' },
  { value: 'FW', label: '공격수' },
]

export const POSITIONS_MIN = 1

// 이미 고른 포지션이면 빼고, 아니면 맨 뒤(가장 낮은 순위)에 붙인다.
export function togglePosition(selected, position) {
  return selected.includes(position)
    ? selected.filter((value) => value !== position)
    : [...selected, position]
}

export function isValidPositions(selected) {
  return (
    selected.length >= POSITIONS_MIN &&
    selected.length <= POSITIONS.length &&
    new Set(selected).size === selected.length
  )
}
