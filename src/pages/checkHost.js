import { listGames } from '../api/games.js'
import { getMyProfile } from '../api/members.js'

// 경기 단건 조회 API가 없어 경기 목록에서 파티장 ID를 찾는다. 못 찾으면 null.
async function findHostId(gameId) {
  for (let page = 0; ; page += 1) {
    const { games, totalPages } = await listGames({ page, size: 100 })
    const game = games.find((candidate) => candidate.id === gameId)
    if (game) return game.hostId
    if (page + 1 >= totalPages) return null
  }
}

// 파티장이면 true, 아니면 false, 확인하지 못하면 null(편집은 열어 두고 BE 응답으로 판단)
export async function checkHost(gameId, knownHostId) {
  const [{ memberId }, hostId] = await Promise.all([
    getMyProfile(),
    knownHostId ?? findHostId(gameId),
  ])
  return hostId === null ? null : hostId === memberId
}
