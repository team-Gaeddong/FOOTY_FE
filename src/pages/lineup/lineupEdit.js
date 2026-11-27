// 팀 직접 수정(FE #68, BE #82 제안): 팀 짜기 결과에서 선수를 다른 팀으로 옮기는 화면 초안의 순수 로직.
//
// teams는 BE LineupResponse.teams와 같다: [{ teamId, name, totalSkill, members: [{ gamePlayerId, name,
// skillLevel, position, isSubstitute }] }].
// moves는 처음 팀과 다른 팀으로 옮긴 선수만 담는다: { [gamePlayerId]: 옮겨 간 팀의 teamId }.
// 저장하기 전에는 화면에서만 바뀌고, 저장하면 BE가 응답으로 새 라인업을 돌려준다.

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

export const NO_MOVES = Object.freeze({})

function teamIdOf(teams, gamePlayerId) {
  const team = teams.find((candidate) => candidate.members.some((member) => member.gamePlayerId === gamePlayerId))
  return team ? team.teamId : null
}

// 옮겨 갈 팀이 라인업에 있을 때만 그 팀을 돌려준다. 모르는 팀을 가리키면 옮기지 않은 것으로 본다.
function destinationOf(teams, moves, gamePlayerId) {
  const to = moves[gamePlayerId]
  return to !== undefined && teams.some((team) => team.teamId === to) ? to : null
}

// 선수를 다른 팀으로 옮긴다. 처음 팀으로 되돌리면 옮긴 기록을 지운다. 모르는 선수·팀은 무시한다.
export function movePlayer(teams, moves, gamePlayerId, toTeamId) {
  const from = teamIdOf(teams, gamePlayerId)
  if (from === null || !teams.some((team) => team.teamId === toTeamId)) return moves
  if (toTeamId === from && moves[gamePlayerId] === undefined) return moves
  const next = { ...moves }
  if (toTeamId === from) delete next[gamePlayerId]
  else next[gamePlayerId] = toTeamId
  return next
}

// 옮긴 결과를 반영한 팀 목록. 그대로 있는 선수는 원래 순서를 지키고, 옮겨 온 선수는 뒤에 붙으며
// movedFrom(처음 팀의 teamId)을 가진다. 입력은 바꾸지 않는다.
export function applyMoves(teams, moves) {
  const arriving = new Map(teams.map((team) => [team.teamId, []]))
  const staying = teams.map((team) => {
    const stay = []
    for (const member of team.members) {
      const to = destinationOf(teams, moves, member.gamePlayerId)
      if (to === null || to === team.teamId) stay.push(member)
      else arriving.get(to).push({ ...member, movedFrom: team.teamId })
    }
    return stay
  })
  return teams.map((team, index) => ({ ...team, members: [...staying[index], ...arriving.get(team.teamId)] }))
}

// 처음과 다른 팀에 있는 선수 수
export function countChanges(teams, moves) {
  return teams.reduce(
    (count, team) =>
      count +
      team.members.filter((member) => {
        const to = destinationOf(teams, moves, member.gamePlayerId)
        return to !== null && to !== team.teamId
      }).length,
    0,
  )
}

// BE 요청 본문의 teams. 라인업의 모든 팀을 한 번씩, 팀 순서는 라인업과 같게 담는다(BE는 선수 목록 전체를 교체한다).
export function buildTeamsRequest(teams, moves) {
  return applyMoves(teams, moves).map((team) => ({
    teamId: team.teamId,
    gamePlayerIds: team.members.map((member) => member.gamePlayerId),
  }))
}

// 옮긴 결과 선수가 한 명도 없는 팀. BE는 팀마다 1명 이상을 요구한다(LINEUP_400_5).
export function findEmptyTeams(teams, moves) {
  return applyMoves(teams, moves).filter((team) => team.members.length === 0)
}

// 저장 전 예상 실력 합계: 후보를 뺀 선발 실력 합계(BE D-22). 실력을 모르는 선수가 있으면 null.
// 저장하면 BE가 다시 계산한 값으로 바뀐다.
export function previewTotalSkill(members) {
  const starters = members.filter((member) => !member.isSubstitute)
  if (starters.some((member) => typeof member.skillLevel !== 'number')) return null
  return starters.reduce((sum, member) => sum + member.skillLevel, 0)
}

// 수정 모드를 보여줄 수 있는지. 파티장이 확인됐고, 팀 확정 전이며, 경기가 모집 중이고(모르면 BE에 맡긴다),
// 저장 에러로 잠기지 않았을 때만이다. 권한 판단은 BE 응답(403)을 따른다.
export function canEditLineup({ lineup, isHost, gameStatus, locked }) {
  if (!lineup || lineup.isConfirmed || locked) return false
  if (isHost !== true) return false
  return gameStatus === undefined || gameStatus === null || gameStatus === 'RECRUITING'
}

// "A팀으로", "레드로"처럼 받침에 맞춰 방향 조사를 붙인다. ㄹ 받침은 '로'다.
export function toTeamLabel(name) {
  const last = name.at(-1) ?? ''
  const code = last.charCodeAt(0) - 0xac00
  const isHangul = code >= 0 && code <= 11171
  if (!isHangul) return `${name}으로`
  const finalConsonant = code % 28
  return finalConsonant === 0 || finalConsonant === 8 ? `${name}로` : `${name}으로`
}

// 저장 실패를 화면 문구로 바꾼다. 분기는 status·code로 하고 BE message는 쓰지 않는다(FD-04).
// lock: 다시 저장해도 안 되는 경우라 수정을 막는다. reload: 최신 라인업을 다시 불러온다(옮긴 내용은 버린다).
// confirmed: BE가 팀 확정을 알려 준 경우. logout: 회원이 없어 로그인 화면으로 보낸다.
export function saveErrorOf(error) {
  const status = typeof error?.status === 'number' ? error.status : null
  const code = typeof error?.code === 'string' ? error.code : null
  if (status === null) return { message: '저장하지 못했습니다. 다시 시도해 주세요.' }
  if (status === 0) return { message: NETWORK_ERROR }
  if (code === 'MEMBER_404_1') return { message: '회원 정보를 찾을 수 없어요. 다시 로그인해 주세요.', logout: true }
  if (code === 'GAME_403_1') return { message: '파티장만 팀을 고칠 수 있어요.', lock: true }
  if (code === 'GAME_404_1') return { message: '경기가 없거나 삭제됐어요. 목록에서 다시 확인해 주세요.', lock: true }
  if (code === 'GAME_409_1') return { message: '모집 중인 경기에서만 팀을 고칠 수 있어요.', lock: true }
  if (code === 'LINEUP_404_2') {
    return { message: '팀 구성을 찾을 수 없어요. 화면을 새로 열어 다시 확인해 주세요.', lock: true }
  }
  if (code === 'LINEUP_409_4') {
    return {
      message: '이미 팀이 확정돼서 더 이상 고칠 수 없어요. 옮긴 내용은 저장되지 않았고 최신 팀 구성을 다시 불러왔어요.',
      lock: true,
      reload: true,
      confirmed: true,
    }
  }
  if (code === 'LINEUP_400_5') return { message: '한 팀에 선수가 1명 이상 있어야 저장할 수 있어요.' }
  if (code === 'LINEUP_400_1' || code === 'LINEUP_400_2' || code === 'LINEUP_400_3' || code === 'LINEUP_400_4') {
    return {
      message: '팀 구성이 바뀌어 저장하지 못했어요. 최신 팀 구성을 다시 불러왔으니 다시 옮겨 주세요.',
      reload: true,
    }
  }
  if (code === 'GLOBAL_400_1') return { message: '저장 요청이 올바르지 않아요. 잠시 후 다시 시도해 주세요.' }
  if (code === 'MEMBER_403_1') return { message: '온보딩을 마친 뒤 팀을 고칠 수 있어요.' }
  if (status === 401) return { message: '로그인이 필요합니다. 다시 로그인해 주세요.' }
  return { message: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
}

// ── 팀 탭의 임시 팀 편집(시안 Lineup)에서 쓰는 계산 ──

// 팀의 선발·후보 수("선발 11 · 후보 1")
export function squadCounts(members) {
  const substitutes = members.filter((member) => member.isSubstitute).length
  return { starters: members.length - substitutes, substitutes }
}

// 두 팀의 예상 실력 합계와 차이, 막대에서 A팀이 차지하는 비율(%). 실력을 모르는 선수가 있거나 팀이 둘이 아니면 null이다.
// teams는 옮긴 결과를 반영한 팀 목록(applyMoves)이다. 저장하기 전에는 화면의 예상이고, 저장하면 BE 값으로 바뀐다.
export function teamBalance(teams) {
  if (teams.length !== 2) return null
  const [a, b] = teams.map((team) => previewTotalSkill(team.members) ?? team.totalSkill)
  if (typeof a !== 'number' || typeof b !== 'number') return null
  const total = a + b
  return { a, b, diff: Math.abs(a - b), aPercent: total > 0 ? Math.round((a / total) * 100) : 50 }
}

const FALLBACK = {
  load: '팀 구성을 불러오지 못했습니다.',
  create: '팀을 짜지 못했습니다.',
  confirm: '팀을 확정하지 못했습니다.',
}

// 팀 짜기·확정·불러오기 실패 안내. action은 'load' | 'create' | 'confirm'이고 분기는 status·code로 한다(FD-04).
export function actionErrorMessage(error, action) {
  const fallback = FALLBACK[action] ?? FALLBACK.create
  const status = typeof error?.status === 'number' ? error.status : null
  const code = typeof error?.code === 'string' ? error.code : null
  if (status === null) return `${fallback} 다시 시도해 주세요.`
  if (status === 0) return NETWORK_ERROR
  if (code === 'GAME_403_1') return action === 'confirm' ? '파티장만 팀을 확정할 수 있어요.' : '파티장만 팀을 짤 수 있어요.'
  if (code === 'GAME_404_1') return '경기가 없거나 삭제됐어요. 목록에서 다시 확인해 주세요.'
  if (code === 'GAME_409_1') return '모집 중인 경기에서만 할 수 있어요.'
  if (code === 'LINEUP_409_1') return '이미 팀을 짠 경기예요. 화면을 새로 열어 주세요.'
  if (code === 'LINEUP_409_2') return '실력 점수가 없는 선수가 있어요. 모든 선수의 실력을 매긴 뒤 다시 시도해 주세요.'
  if (code === 'LINEUP_409_3') return '팀을 짜려면 참가 선수가 2명 이상이어야 해요.'
  if (code === 'LINEUP_404_2') return '팀 구성을 찾을 수 없어요. 화면을 새로 열어 다시 확인해 주세요.'
  if (code === 'MEMBER_403_1') return '온보딩을 마친 뒤 할 수 있어요.'
  if (status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return `${fallback} 잠시 후 다시 시도해 주세요.`
}

// 팀을 짜기 전에 막아야 하는지. 선수가 2명 미만이거나 실력을 안 매긴 선수가 있으면 BE가 409로 거절한다(LINEUP_409_3·409_2).
// unrated는 실력을 안 매긴 선수 수(모르면 null)이고, 모르면 막지 않고 BE 응답에 맡긴다.
export function createBlocker({ playerCount, unrated }) {
  if (playerCount < 2) return 'few'
  if (unrated !== null && unrated > 0) return 'unrated'
  return null
}
