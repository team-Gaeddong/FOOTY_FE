import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { GOOGLE_LOGIN_URL } from '../../api/auth.js'
import { useAuth } from '../../auth/useAuth.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { ClockIcon, PitchIcon, SwapIcon, TrophyIcon } from '../../components/Icons.jsx'
import { LoadingScreen } from '../../components/LoadingScreen.jsx'
import { StateCard } from '../../components/StateCard.jsx'
import { loginErrorView, loginNoticeMessage } from './loginView.js'
import styles from './LoginPage.module.css'

const FEATURES = [
  { Icon: SwapIcon, title: '실력 기반 팀 편성', text: '파티장이 매긴 실력으로 A·B팀을 고르게 나눠요.' },
  { Icon: PitchIcon, title: '전술 배치도', text: '포메이션을 고르고 선수를 경기장에 올려 저장해요.' },
  { Icon: TrophyIcon, title: '경기 후 밸런스·MVP', text: '평가와 투표로 다음 경기를 더 팽팽하게 만들어요.' },
]

export function LoginPage() {
  const { status } = useAuth()
  const location = useLocation()
  const [redirecting, setRedirecting] = useState(false)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to="/" replace />

  const errorView = loginErrorView(location.state?.error)
  const noticeMessage = loginNoticeMessage(location.state?.notice)

  function handleLogin() {
    setRedirecting(true)
    window.location.assign(GOOGLE_LOGIN_URL)
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.logo}>FOOTY</p>
        <div className={styles.headline}>
          <h1 className={styles.title}>
            팀 짜기부터 전술까지,
            <br />
            경기 한 판을 한 곳에서.
          </h1>
          <p className={styles.lead}>아마추어 축구·풋살 경기를 모으고, 나누고, 돌아보는 서비스</p>
        </div>
        <ul className={styles.features}>
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon />
              </span>
              <div className={styles.featureText}>
                <p className={styles.featureTitle}>{title}</p>
                <p className={styles.featureDescription}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel}>
        {errorView?.kind === 'expired' ? (
          <StateCard
            tone="danger"
            icon={<ClockIcon size={22} />}
            title="로그인 시간이 지났어요"
            actions={
              <>
                <Button fit="auto" onClick={handleLogin} disabled={redirecting}>
                  {redirecting ? 'Google로 이동 중…' : '다시 로그인'}
                </Button>
                <span className={styles.code}>AUTH_401_1</span>
              </>
            }
            role="alert"
          >
            로그인 코드가 만료됐어요. 처음부터 다시 로그인해 주세요.
          </StateCard>
        ) : (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>로그인</h2>
            <p className={styles.cardText}>
              Google 계정 하나로 시작해요. 처음이라면 닉네임만 정하고 바로 이용할 수 있어요.
            </p>
            {noticeMessage && (
              <p className={styles.notice} role="status">
                {noticeMessage}
              </p>
            )}
            <ErrorMessage>{errorView?.message}</ErrorMessage>
            <Button variant="light" size="lg" onClick={handleLogin} disabled={redirecting}>
              <GoogleIcon />
              {redirecting ? 'Google로 이동 중…' : 'Google로 계속하기'}
            </Button>
            <p className={styles.footnote}>다른 로그인 방식은 지원하지 않아요.</p>
          </div>
        )}
      </section>
    </main>
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
