import { startTransition, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getMyProfile, withdraw } from '../../api/member.js'
import { useAuth } from '../../auth/useAuth.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { AlertTriangleIcon, CheckIcon } from '../../components/Icons.jsx'
import { withdrawErrorMessage, withdrawFacts } from './profile.js'
import styles from './WithdrawPage.module.css'

// 회원 탈퇴 확인(/withdraw, 시안 Withdraw). 이 화면이 확인 단계라서 되돌릴 수 없음·복구 방법을 안내하고, 탈퇴하기를 눌러야 요청을 보낸다.
// 닉네임 안내를 위해 프로필을 받지만 못 받아도 나머지 안내와 탈퇴는 그대로 된다.
export function WithdrawPage() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    getMyProfile()
      .then((profile) => {
        if (active) setNickname(profile.nickname ?? null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

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
      setError(withdrawErrorMessage(e))
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <section className={styles.card} aria-labelledby="withdraw-title">
          <span className={styles.icon} aria-hidden="true">
            <AlertTriangleIcon size={24} />
          </span>
          <div className={styles.heading}>
            <h1 id="withdraw-title" className={styles.title}>
              정말 탈퇴할까요?
            </h1>
            <p className={styles.lead}>탈퇴하기 전에 아래 내용을 확인해 주세요.</p>
          </div>
          <ul className={styles.facts}>
            {withdrawFacts(nickname).map((fact) => (
              <li key={fact} className={styles.fact}>
                <CheckIcon size={16} />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          <ErrorMessage>{error}</ErrorMessage>
        </section>
        <div className={styles.actions}>
          <Button as={Link} to="/profile" variant="secondary" size="lg" fit="responsive" className={styles.keep}>
            계속 이용하기
          </Button>
          <Button variant="danger" size="lg" fit="responsive" className={styles.confirm} onClick={handleWithdraw} disabled={submitting}>
            {submitting ? '탈퇴 중…' : '탈퇴하기'}
          </Button>
        </div>
      </div>
    </main>
  )
}
