import { startTransition, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { withdraw } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './WithdrawPage.module.css'

export function WithdrawPage() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function leave() {
    navigate('/login', { replace: true, state: { notice: 'withdrawn' } })
    // 라우터가 위치를 transition으로 바꾸므로 세션도 같은 transition에서 지운다.
    // 아니면 RequireAuth가 먼저 state 없는 /login으로 보낸다.
    startTransition(() => clearSession())
  }

  async function handleWithdraw() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await withdraw()
      leave()
    } catch (e) {
      // 회원이 이미 없으면 탈퇴된 것으로 본다.
      if (e.code === 'MEMBER_404_1') {
        leave()
        return
      }
      if (e.status === 0) setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      else setError('탈퇴하지 못했습니다. 다시 시도해 주세요.')
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <header className={styles.header}>
        <h1 className={styles.title}>회원 탈퇴</h1>
        <p className={styles.description}>
          탈퇴하면 이 기기와 다른 기기에서 모두 로그아웃됩니다. 같은 Google
          계정으로 다시 로그인하면 계정이 복구됩니다.
        </p>
      </header>
      <label className={styles.confirm}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        안내를 확인했고 탈퇴합니다.
      </label>
      <ErrorMessage>{error}</ErrorMessage>
      <div className={styles.actions}>
        <Button
          variant="danger"
          onClick={handleWithdraw}
          disabled={!confirmed || submitting}
        >
          {submitting ? '탈퇴 중…' : '탈퇴하기'}
        </Button>
        <Link to="/" className={styles.cancel}>
          취소
        </Link>
      </div>
    </PageLayout>
  )
}
