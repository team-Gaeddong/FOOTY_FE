import { startTransition, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { completeOnboarding } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  isValidNickname,
  nicknameLength,
} from './nickname.js'
import styles from './OnboardingPage.module.css'

const INVALID_NICKNAME = `닉네임은 앞뒤 공백을 제외하고 ${NICKNAME_MIN}~${NICKNAME_MAX}자여야 합니다.`

// 첫 로그인 뒤 닉네임을 입력해야 가입이 끝난다(BE D-05e).
export function OnboardingPage() {
  const { status, onboarded, markOnboarded, clearSession, signOut } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  if (onboarded) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!isValidNickname(nickname)) {
      setError(INVALID_NICKNAME)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await completeOnboarding(nickname.trim())
      markOnboarded()
      navigate('/', { replace: true })
    } catch (e) {
      if (e.code === 'MEMBER_409_1') {
        // 이미 온보딩을 마쳤으면 그대로 홈으로 보낸다.
        markOnboarded()
        navigate('/', { replace: true })
        return
      }
      if (e.code === 'MEMBER_404_1') {
        navigate('/login', { replace: true, state: { error: 'member_not_found' } })
        // 이동과 같은 transition에서 지워야 안내(state)가 남는다(WithdrawPage 참고).
        startTransition(() => clearSession())
        return
      }
      if (e.code === 'MEMBER_400_1') setError(INVALID_NICKNAME)
      else if (e.status === 0) setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      else setError('저장하지 못했습니다. 다시 시도해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <PageLayout centered>
      <header className={styles.header}>
        <h1 className={styles.title}>닉네임을 정해 주세요</h1>
        <p className={styles.description}>
          경기에서 다른 선수에게 보이는 이름이에요.
        </p>
      </header>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.label} htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className={styles.input}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          autoComplete="nickname"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby="nickname-help"
        />
        <p id="nickname-help" className={styles.help}>
          <span>
            앞뒤 공백 제외 {NICKNAME_MIN}~{NICKNAME_MAX}자
          </span>
          <span>
            {nicknameLength(nickname)}/{NICKNAME_MAX}
          </span>
        </p>
        <ErrorMessage>{error}</ErrorMessage>
        <Button type="submit" disabled={submitting}>
          {submitting ? '저장 중…' : '시작하기'}
        </Button>
      </form>
      <button type="button" className={styles.textButton} onClick={signOut}>
        다른 계정으로 로그인
      </button>
    </PageLayout>
  )
}
