import { useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './HomePage.module.css'

// 로그인 후 첫 화면. 경기 목록 등은 각 기능 이슈에서 채운다.
export function HomePage() {
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  return (
    <PageLayout>
      <header className={styles.header}>
        <h1 className={styles.logo}>FOOTY</h1>
        <Button
          variant="secondary"
          className={styles.signOut}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? '로그아웃 중…' : '로그아웃'}
        </Button>
      </header>
    </PageLayout>
  )
}
