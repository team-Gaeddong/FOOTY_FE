import { useEffect, useState } from 'react'
import { getGame } from '../../api/games.js'

// 화면 머리글(경기 제목·일시)과 파티장 여부를 위해 경기 정보를 불러온다.
// 앞 화면이 넘겨준 요약(location.state.game)이 있으면 먼저 그것을 쓰고, 응답이 오면 바꾼다.
// 실패해도 화면 본문은 막지 않는다. 머리글만 비고 파티장 전용 안내가 숨는다.
export function useGameInfo(gameId, initialGame = null) {
  const [loaded, setLoaded] = useState(null) // { gameId, game } | { gameId, error }
  const current = loaded?.gameId === gameId ? loaded : null

  useEffect(() => {
    if (gameId === null) return undefined
    let active = true
    getGame(gameId).then(
      (game) => {
        if (active) setLoaded({ gameId, game })
      },
      (error) => {
        if (active) setLoaded({ gameId, error })
      },
    )
    return () => {
      active = false
    }
  }, [gameId])

  const fallback = initialGame?.id === gameId ? initialGame : null
  return current?.game ?? fallback
}
