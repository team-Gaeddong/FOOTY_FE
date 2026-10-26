import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { GOOGLE_LOGIN_URL } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './LoginPage.module.css'

// 콜백 화면이 넘겨준 실패 사유(location.state.error)별 안내 문구
const ERROR_MESSAGES = {
  login_failed: 'Google 로그인에 실패했습니다. 다시 시도해 주세요.',
  code_expired: '로그인 시간이 지났습니다. 다시 로그인해 주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  unknown: '로그인 중 문제가 발생했습니다. 다시 시도해 주세요.',
}

export function LoginPage() {
  const { status } = useAuth()
  const location = useLocation()
  const [redirecting, setRedirecting] = useState(false)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to="/" replace />

  const errorKey = location.state?.error
  const errorMessage = errorKey && ERROR_MESSAGES[errorKey]

  function handleLogin() {
    setRedirecting(true)
    window.location.assign(GOOGLE_LOGIN_URL)
  }

  return (
    <PageLayout centered>
      <header className={styles.header}>
        <h1 className={styles.logo}>FOOTY</h1>
        <p className={styles.tagline}>경기를 만들고, 팀을 나누고, 함께 평가해요</p>
      </header>
      <ErrorMessage>{errorMessage}</ErrorMessage>
      <Button variant="secondary" onClick={handleLogin} disabled={redirecting}>
        <GoogleIcon />
        {redirecting ? 'Google로 이동 중…' : 'Google로 로그인'}
      </Button>
    </PageLayout>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
