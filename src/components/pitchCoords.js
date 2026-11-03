// 경기장 좌표 변환. BE는 경기장 대비 퍼센트 0~100, 소수 2자리로 저장한다(BE D-23, DECIMAL(5,2)).
// 퍼센트로 저장해서 화면 크기가 달라도 같은 위치에 보인다.

export function roundPercent(value) {
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100
}

// 화면 좌표(clientX·Y)를 경기장 퍼센트로 바꾼다. 경기장 밖이면 null.
export function clientToPercent(clientX, clientY, rect) {
  const x = ((clientX - rect.left) / rect.width) * 100
  const y = ((clientY - rect.top) / rect.height) * 100
  if (x < 0 || x > 100 || y < 0 || y > 100) return null
  return { x: roundPercent(x), y: roundPercent(y) }
}

export function percentDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// 경기장 위 요소를 퍼센트 좌표의 중심에 놓는 스타일.
export function pitchPosition({ x, y }) {
  return { left: `${x}%`, top: `${y}%` }
}
