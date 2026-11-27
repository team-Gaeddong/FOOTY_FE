// 경기별 선수 포지션(BE D-13). positions는 우선순위 순 배열이다.

// 순서(우선순위)까지 같아야 같은 값이다.
export function samePositions(a, b) {
  return a.length === b.length && a.every((position, index) => position === b[index])
}

// 저장에 성공한 포지션을 목록에 반영한다.
export function applyPositions(players, gamePlayerId, positions) {
  return players.map((player) =>
    player.id === gamePlayerId ? { ...player, positions: [...positions] } : player,
  )
}

export function countWithoutPositions(players) {
  return players.filter((player) => player.positions.length === 0).length
}
