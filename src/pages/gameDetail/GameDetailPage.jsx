import { useOutletContext } from 'react-router'
import { GameHeader } from './GameHeader.jsx'
import { GameOverview } from './GameOverview.jsx'

// 경기 상세의 개요 탭. 경기는 GameDetailLayout이 불러서 넘겨 준다.
export function GameDetailPage() {
  const { game, onUpdated } = useOutletContext()

  return (
    <>
      <GameHeader game={game} />
      <GameOverview game={game} onUpdated={onUpdated} />
    </>
  )
}
