import { useEffect, useState } from 'react'
import { logout } from '../api/auth.js'
import { refreshSession, setSessionExpiredHandler } from '../api/client.js'
import { AuthContext } from './authContext.js'
import { clearTokens, getRefreshToken, saveTokens } from './tokenStore.js'

const GUEST = { status: 'guest', onboarded: false }

function toSession(tokens) {
  return tokens ? { status: 'authenticated', onboarded: tokens.onboarded } : GUEST
}

// FD-07: 로그인 상태는 Context로 공유한다.
// status: 'loading'(새로고침 후 재발급 중) | 'guest' | 'authenticated'
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() =>
    getRefreshToken() ? { status: 'loading', onboarded: false } : GUEST,
  )

  useEffect(() => {
    setSessionExpiredHandler(() => setSession(GUEST))
    return () => setSessionExpiredHandler(() => {})
  }, [])

  // 새로고침하면 메모리의 access가 사라지므로 refresh로 다시 받는다.
  useEffect(() => {
    if (!getRefreshToken()) return
    let ignore = false
    refreshSession().then((tokens) => {
      if (!ignore) setSession(toSession(tokens))
    })
    return () => {
      ignore = true
    }
  }, [])

  function signIn(tokens) {
    saveTokens(tokens)
    setSession(toSession(tokens))
  }

  async function signOut() {
    try {
      await logout()
    } catch {
      // BE 로그아웃이 실패해도 이 기기의 토큰은 지운다.
    } finally {
      clearTokens()
      setSession(GUEST)
    }
  }

  const value = { ...session, signIn, signOut }
  return <AuthContext value={value}>{children}</AuthContext>
}
