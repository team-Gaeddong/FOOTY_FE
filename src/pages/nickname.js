// BE MemberService와 같은 규칙: 앞뒤 공백 제거 후 코드 포인트 2~10자, 중복 허용(BE D-05e)
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 10

export function nicknameLength(nickname) {
  return [...nickname.trim()].length
}

export function isValidNickname(nickname) {
  const length = nicknameLength(nickname)
  return length >= NICKNAME_MIN && length <= NICKNAME_MAX
}
