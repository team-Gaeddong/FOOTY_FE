import { useState } from 'react'
import { Link } from 'react-router'
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
      <section className={styles.welcome}>
        <p className={styles.eyebrow}>새로운 경기를 시작해요</p>
        <h2>함께 뛸 경기를 만들어 보세요</h2>
        <p className={styles.description}>
          날짜와 장소, 참가 인원을 정하면 경기를 등록할 수 있어요.
        </p>
        <div className={styles.actions}>
          <Link className={styles.createLink} to="/games/new">경기 만들기</Link>
          <Link className={styles.listLink} to="/games">경기 목록 보기</Link>
        </div>
      </section>
    </PageLayout>
  )
}
