import { startTransition, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { completeOnboarding, updatePositions } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/Button.jsx'
import { ErrorMessage } from '../components/ErrorMessage.jsx'
import { LoadingScreen } from '../components/LoadingScreen.jsx'
import { PageLayout } from '../components/PageLayout.jsx'
import { PositionPicker } from '../components/PositionPicker.jsx'
import { isValidPositions } from '../components/positions.js'
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  isValidNickname,
  nicknameLength,
} from './nickname.js'
import styles from './OnboardingPage.module.css'

const INVALID_NICKNAME = `닉네임은 앞뒤 공백을 제외하고 ${NICKNAME_MIN}~${NICKNAME_MAX}자여야 합니다.`
const INVALID_POSITIONS = '선호 포지션을 1~4개 골라 주세요.'
const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

function nicknameErrorMessage(error) {
  if (error.code === 'MEMBER_400_1') return INVALID_NICKNAME
  if (error.status === 0) return NETWORK_ERROR
  return '저장하지 못했습니다. 다시 시도해 주세요.'
}

// 닉네임은 이미 저장된 뒤라 포지션만 다시 보내면 된다.
function positionsErrorMessage(error) {
  if (error.code === 'MEMBER_400_2') return INVALID_POSITIONS
  const reason = error.status === 0 ? NETWORK_ERROR : '포지션을 저장하지 못했습니다.'
  return `${reason} 닉네임은 저장됐어요. 포지션만 다시 저장해 주세요.`
}

// 첫 로그인 뒤 닉네임과 선호 포지션을 받아 가입을 마친다(BE D-05e, D-13).
// 포지션 API는 온보딩 전에는 막혀 있으므로 닉네임 PATCH가 성공한 뒤에 PUT한다.
export function OnboardingPage() {
  const { status, onboarded, markOnboarded, clearSession, signOut } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [positions, setPositions] = useState([])
  // 닉네임 저장 후 포지션 저장만 실패하면 다시 시도할 때 포지션만 보낸다.
  const [nicknameSaved, setNicknameSaved] = useState(false)
  const [error, setError] = useState(null) // { field: 'nickname' | 'positions' | null, message }
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  if (onboarded) return <Navigate to="/" replace />

  function handleFailure(e, nextError) {
    if (e.code === 'MEMBER_404_1') {
      navigate('/login', { replace: true, state: { error: 'member_not_found' } })
      // 이동과 같은 transition에서 지워야 안내(state)가 남는다(WithdrawPage 참고).
      startTransition(() => clearSession())
      return
    }
    setError(nextError)
    setSubmitting(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!nicknameSaved && !isValidNickname(nickname)) {
      setError({ field: 'nickname', message: INVALID_NICKNAME })
      return
    }
    if (!isValidPositions(positions)) {
      setError({ field: 'positions', message: INVALID_POSITIONS })
      return
    }

    setSubmitting(true)
    setError(null)

    if (!nicknameSaved) {
      try {
        await completeOnboarding(nickname.trim())
      } catch (e) {
        // 409는 다른 탭 등에서 이미 온보딩을 마친 경우다. 포지션 저장은 이어서 한다.
        if (e.code !== 'MEMBER_409_1') {
          const field = e.code === 'MEMBER_400_1' ? 'nickname' : null
          handleFailure(e, { field, message: nicknameErrorMessage(e) })
          return
        }
      }
      setNicknameSaved(true)
    }

    try {
      await updatePositions(positions)
    } catch (e) {
      const field = e.code === 'MEMBER_400_2' ? 'positions' : null
      handleFailure(e, { field, message: positionsErrorMessage(e) })
      return
    }

    markOnboarded()
    navigate('/', { replace: true })
  }

  return (
    <PageLayout centered>
      <header className={styles.header}>
        <h1 className={styles.title}>닉네임과 포지션을 정해 주세요</h1>
        <p className={styles.description}>
          경기에서 다른 선수에게 보이는 이름과 선호 포지션이에요.
        </p>
      </header>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            className={styles.input}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            readOnly={nicknameSaved}
            autoComplete="nickname"
            autoFocus
            aria-invalid={error?.field === 'nickname'}
            aria-describedby="nickname-help"
          />
          <p id="nickname-help" className={styles.help}>
            <span>
              {nicknameSaved
                ? '저장됐어요'
                : `앞뒤 공백 제외 ${NICKNAME_MIN}~${NICKNAME_MAX}자`}
            </span>
            <span>
              {nicknameLength(nickname)}/{NICKNAME_MAX}
            </span>
          </p>
        </div>

        <PositionPicker
          legend="선호 포지션"
          value={positions}
          onChange={(next) => {
            setPositions(next)
            if (error?.field === 'positions') setError(null)
          }}
          invalid={error?.field === 'positions'}
        />

        <ErrorMessage>{error?.message}</ErrorMessage>
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
