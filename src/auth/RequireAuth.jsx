import { Navigate, Outlet } from 'react-router'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { useAuth } from './useAuth.js'

// 로그인과 온보딩을 마친 회원만 들어갈 수 있는 화면을 감싼다.
export function RequireAuth() {
  const { status, onboarded } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  // 온보딩 전에는 대부분의 API가 403 MEMBER_403_1이다(BE D-05e).
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
