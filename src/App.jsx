import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { RequireAuth } from './auth/RequireAuth.jsx'
import { CreateGamePage } from './pages/CreateGamePage.jsx'
import { GameListPage } from './pages/GameListPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LoginCallbackPage } from './pages/LoginCallbackPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { OnboardingPage } from './pages/OnboardingPage.jsx'
import { WithdrawPage } from './pages/WithdrawPage.jsx'

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
            <Route path="/" element={<HomePage />} />
            <Route path="/games/new" element={<CreateGamePage />} />
            <Route path="/games" element={<GameListPage />} />
            <Route path="/withdraw" element={<WithdrawPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
