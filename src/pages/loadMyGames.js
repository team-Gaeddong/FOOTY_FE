import { listGamePages } from '../api/games.js'
import { getMyProfile } from '../api/members.js'
import { groupMyGames } from './myGames.js'

// 목록을 끝까지 받는 데 쓰는 요청 수의 안전 상한. 100개씩 20번이면 경기 2000개까지 본다.
export const MAX_PAGES = 20

// 내가 만든 경기를 불러온다. BE에 "내 경기" 필터가 없어(FD-21) 전체 목록을 페이지마다 받아 거른다.
// 경기별 상세는 부르지 않는다. truncated가 true면 상한 때문에 마지막 쪽 경기(일시가 먼 경기)를 못 봤다는 뜻이다.
export async function loadMyGames() {
  const { memberId } = await getMyProfile()

  const games = []
  let pagesRead = 0
  let totalPages = 0
  for await (const data of listGamePages({ maxPages: MAX_PAGES })) {
    games.push(...data.games)
    pagesRead += 1
    totalPages = data.totalPages
  }

  return { ...groupMyGames(games, memberId), truncated: totalPages > pagesRead }
}
