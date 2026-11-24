import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { RequireAuth } from './auth/RequireAuth.jsx'
import { AppShell } from './components/AppShell.jsx'
import { BalanceReviewPage } from './pages/BalanceReviewPage.jsx'
import { BalanceSummaryPage } from './pages/BalanceSummaryPage.jsx'
import { CreateGamePage } from './pages/CreateGamePage.jsx'
import { GameDetailLayout } from './pages/GameDetailLayout.jsx'
import { GameDetailPage } from './pages/GameDetailPage.jsx'
import { GameAfterPage } from './pages/GameAfterPage.jsx'
import { GameLineupPage } from './pages/GameLineupPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LoginCallbackPage } from './pages/LoginCallbackPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { NoticeCreatePage } from './pages/NoticeCreatePage.jsx'
import { NoticesPage } from './pages/NoticesPage.jsx'
import { MvpVotePage } from './pages/MvpVotePage.jsx'
import { MyGamesPage } from './pages/MyGamesPage.jsx'
import { OnboardingPage } from './pages/OnboardingPage.jsx'
import { PlayersPage } from './pages/PlayersPage.jsx'
import { PollCreatePage } from './pages/PollCreatePage.jsx'
import { PollDetailPage, PollListPage } from './pages/PollPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { RematchGamePage } from './pages/RematchGamePage.jsx'
import { ReportPage } from './pages/ReportPage.jsx'
import { TacticPage } from './pages/TacticPage.jsx'
import { TeamMatchPage } from './pages/TeamMatchPage.jsx'
import { WithdrawPage } from './pages/WithdrawPage.jsx'

// 홈(/)이 경기 목록을 겸하므로 옛 /games는 홈으로 보낸다. 삭제 완료 안내 같은 state는 그대로 넘긴다.
function GamesRedirect() {
  const { state } = useLocation()
  return <Navigate to="/" replace state={state} />
}

// 선수 관리가 옛 "실력 매기기"(/skill-levels)와 "포지션 설정"(/positions)을 합쳤다. 옛 경로는 새 경로로 보낸다.
function PlayersRedirect() {
  const { gameId } = useParams()
  const { state } = useLocation()
  return <Navigate to={`/games/${gameId}/players`} replace state={state} />
}

// FD-03: react-router. /login/callback은 BE OAUTH_REDIRECT_URI와 맞춘다.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/callback" element={<LoginCallbackPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/games/new" element={<CreateGamePage />} />
              <Route path="/games/mine" element={<MyGamesPage />} />
              <Route path="/games" element={<GamesRedirect />} />
              <Route path="/games/:gameId" element={<GameDetailLayout />}>
              <Route index element={<GameDetailPage />} />
              <Route path="lineup" element={<GameLineupPage />} />
              <Route path="notices" element={<NoticesPage />} />
              <Route path="notices/:noticeId" element={<NoticesPage />} />
              <Route path="after" element={<GameAfterPage />} />
            </Route>
              <Route path="/games/:gameId/notices/new" element={<NoticeCreatePage />} />
              <Route path="/games/:gameId/polls/new" element={<PollCreatePage />} />
              <Route path="/games/:gameId/polls" element={<PollListPage />} />
              <Route path="/games/:gameId/polls/:pollId" element={<PollDetailPage />} />
              <Route path="/games/:gameId/balance-review" element={<BalanceReviewPage />} />
              <Route path="/games/:gameId/balance-summary" element={<BalanceSummaryPage />} />
              <Route path="/games/:gameId/mvp-vote" element={<MvpVotePage />} />
              <Route path="/games/:gameId/rematch" element={<RematchGamePage />} />
              <Route path="/games/:gameId/players" element={<PlayersPage />} />
              <Route path="/games/:gameId/skill-levels" element={<PlayersRedirect />} />
              <Route path="/games/:gameId/positions" element={<PlayersRedirect />} />
              <Route path="/games/:gameId/lineup/edit" element={<TeamMatchPage />} />
              <Route path="/games/:gameId/teams/:teamId/tactic" element={<TacticPage />} />
              <Route path="/games/:gameId/report" element={<ReportPage />} />
              <Route path="/withdraw" element={<WithdrawPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
