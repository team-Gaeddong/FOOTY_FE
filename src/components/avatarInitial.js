// 아바타에 넣을 한 글자. 이름의 첫 글자(코드 포인트 기준)이고 영문은 대문자로 바꾼다. 없으면 '?'.
export function avatarInitial(name) {
  const first = [...String(name ?? '').trim()][0]
  return first ? first.toUpperCase() : '?'
}
