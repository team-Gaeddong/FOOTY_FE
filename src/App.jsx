import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { RequireAuth } from './auth/RequireAuth.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LoginCallbackPage } from './pages/LoginCallbackPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'

// FD-03: react-router. /login/callback은 BE OAUTH_REDIRECT_URI와 맞춘다.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/callback" element={<LoginCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
