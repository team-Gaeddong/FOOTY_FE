// BE UpdateSkillLevelsRequest: 정수 1~10(BE #19)
export const SKILL_MIN = 1
export const SKILL_MAX = 10
export const SKILL_OPTIONS = Array.from({ length: SKILL_MAX - SKILL_MIN + 1 }, (_, i) => SKILL_MIN + i)

// drafts는 화면에서 고친 값만 담는다({ [gamePlayerId]: skillLevel }). 없으면 저장된 값을 쓴다.
export function effectiveSkill(player, drafts) {
  return drafts[player.id] ?? player.skillLevel
}

// 저장된 값과 다른 선수만 보낸다. BE는 보낸 선수만 바꾼다.
export function changedSkillLevels(players, drafts) {
  return players
    .filter((player) => drafts[player.id] !== undefined && drafts[player.id] !== player.skillLevel)
    .map((player) => ({ gamePlayerId: player.id, skillLevel: drafts[player.id] }))
}

export function countUnrated(players, drafts) {
  return players.filter((player) => effectiveSkill(player, drafts) === null).length
}

// 저장에 성공한 값을 목록에 반영한다.
export function applySkillLevels(players, saved) {
  const levels = new Map(saved.map(({ gamePlayerId, skillLevel }) => [gamePlayerId, skillLevel]))
  return players.map((player) =>
    levels.has(player.id) ? { ...player, skillLevel: levels.get(player.id) } : player,
  )
}
