// 전술 배치도의 포메이션 프리셋. 좌표는 BE와 같은 퍼센트(0~100)이고
// x는 왼쪽→오른쪽, y는 상대 골문(0)→우리 골문(100)이다. 슬롯 위치는 화면 배치용 FE 값이다.
// role은 빈 슬롯에 보여줄 표시일 뿐 BE 배정 포지션을 바꾸지 않는다(BE D-23).
const GK = { role: 'GK', x: 50, y: 90 }

export const FORMATIONS = {
  '4-4-2': [
    GK,
    { role: 'DF', x: 15, y: 70 },
    { role: 'DF', x: 38, y: 73 },
    { role: 'DF', x: 62, y: 73 },
    { role: 'DF', x: 85, y: 70 },
    { role: 'MF', x: 15, y: 46 },
    { role: 'MF', x: 38, y: 50 },
    { role: 'MF', x: 62, y: 50 },
    { role: 'MF', x: 85, y: 46 },
    { role: 'FW', x: 38, y: 22 },
    { role: 'FW', x: 62, y: 22 },
  ],
  '4-3-3': [
    GK,
    { role: 'DF', x: 15, y: 70 },
    { role: 'DF', x: 38, y: 73 },
    { role: 'DF', x: 62, y: 73 },
    { role: 'DF', x: 85, y: 70 },
    { role: 'MF', x: 27, y: 50 },
    { role: 'MF', x: 50, y: 54 },
    { role: 'MF', x: 73, y: 50 },
    { role: 'FW', x: 18, y: 24 },
    { role: 'FW', x: 50, y: 18 },
    { role: 'FW', x: 82, y: 24 },
  ],
  '3-5-2': [
    GK,
    { role: 'DF', x: 27, y: 72 },
    { role: 'DF', x: 50, y: 75 },
    { role: 'DF', x: 73, y: 72 },
    { role: 'MF', x: 10, y: 46 },
    { role: 'MF', x: 30, y: 52 },
    { role: 'MF', x: 50, y: 42 },
    { role: 'MF', x: 70, y: 52 },
    { role: 'MF', x: 90, y: 46 },
    { role: 'FW', x: 38, y: 20 },
    { role: 'FW', x: 62, y: 20 },
  ],
}

export const FORMATION_NAMES = Object.keys(FORMATIONS)
export const DEFAULT_FORMATION = '4-4-2'

// 프리셋에 없는 포메이션(BE는 20자 이하 문자열이면 받는다)은 슬롯 없이 다룬다.
export function formationSlots(formation) {
  return FORMATIONS[formation] ?? []
}
