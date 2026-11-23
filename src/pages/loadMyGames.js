import { listGamePages } from '../api/games.js'
import { groupMyGames } from './myGames.js'

// 목록을 끝까지 받는 데 쓰는 요청 수의 안전 상한. 100개씩 20번이면 경기 2000개까지 본다.
export const MAX_PAGES = 20

// 내가 파티장인 경기를 불러온다. BE `GET /games?role=host`(BE D-37)가 거른 결과만 쪽마다 받아 모은다.
// 경기별 상세는 부르지 않는다. truncated가 true면 상한 때문에 마지막 쪽 경기(일시가 먼 경기)를 못 봤다는 뜻이다.
// 화면이 이미 떠났으면(isActive가 false) 남은 페이지는 더 받지 않는다.
export async function loadMyGames({ isActive = () => true } = {}) {
  const games = []
  let pagesRead = 0
  let totalPages = 0
  for await (const data of listGamePages({ maxPages: MAX_PAGES, role: 'host' })) {
    games.push(...data.games)
    pagesRead += 1
    totalPages = data.totalPages
    if (!isActive()) break
  }

  return { ...groupMyGames(games), truncated: totalPages > pagesRead }
}
