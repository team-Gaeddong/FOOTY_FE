import { startTransition, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { completeOnboarding, updatePositions } from '../../api/member.js'
import { useAuth } from '../../auth/useAuth.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { Field } from '../../components/Field.jsx'
import { LogoutIcon, UserIcon } from '../../components/Icons.jsx'
import { LoadingScreen } from '../../components/LoadingScreen.jsx'
import { PositionPicker } from '../../components/PositionPicker.jsx'
import { isValidPositions } from '../../components/positions.js'
import { StateCard } from '../../components/StateCard.jsx'
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  isValidNickname,
  nicknameLength,
} from './nickname.js'
import {
  INVALID_NICKNAME,
  INVALID_POSITIONS,
  describeNicknameFailure,
  describePositionsFailure,
} from './onboarding.js'
import styles from './OnboardingPage.module.css'

const NICKNAME_HINT = `앞뒤 공백을 빼고 ${NICKNAME_MIN}~${NICKNAME_MAX}자. 다른 사람이 쓰는 닉네임은 쓸 수 없어요.`
const POSITIONS_HINT =
  '1~4개를 골라 주세요. 누른 순서가 우선순위예요. 경기에 참가할 때 기본값으로 들어가고, 프로필에서 바꿀 수 있어요.'

// 첫 로그인 뒤 닉네임과 선호 포지션을 받아 가입을 마친다(BE D-05e, D-13).
// 포지션 API는 온보딩 전에는 막혀 있으므로 닉네임 PATCH가 성공한 뒤에 PUT한다.
export function OnboardingPage() {
  const { status, onboarded, markOnboarded, clearSession, signOut } = useAuth()
  const navigate = useNavigate()
  const nicknameInput = useRef(null)
  const [nickname, setNickname] = useState('')
  const [positions, setPositions] = useState([])
  // 닉네임 저장 후 포지션 저장만 실패하면 다시 시도할 때 포지션만 보낸다.
  const [nicknameSaved, setNicknameSaved] = useState(false)
  // { kind, field: 'nickname' | 'positions' | null, message }
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  if (onboarded) return <Navigate to="/" replace />

  const nicknameTaken = error?.kind === 'taken'
  const nicknameError = error?.field === 'nickname' && !nicknameTaken ? error.message : undefined
  const formError = error?.field === 'nickname' && !nicknameTaken ? null : error?.message

  function handleFailure(e, failure) {
    if (e.code === 'MEMBER_404_1') {
      navigate('/login', { replace: true, state: { error: 'member_not_found' } })
      // 이동과 같은 transition에서 지워야 안내(state)가 남는다(WithdrawPage 참고).
      startTransition(() => clearSession())
      return
    }
    setError(failure)
    setSubmitting(false)
  }

  function retypeNickname() {
    setError(null)
    nicknameInput.current?.focus()
    nicknameInput.current?.select()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!nicknameSaved && !isValidNickname(nickname)) {
      setError({ kind: 'invalid', field: 'nickname', message: INVALID_NICKNAME })
      return
    }
    if (!isValidPositions(positions)) {
      setError({ kind: 'invalid', field: 'positions', message: INVALID_POSITIONS })
      return
    }

    setSubmitting(true)
    setError(null)

    if (!nicknameSaved) {
      try {
        await completeOnboarding(nickname.trim())
      } catch (e) {
        // 이미 온보딩을 마친 경우(다른 탭 등)는 포지션 저장을 이어서 한다.
        const failure = describeNicknameFailure(e)
        if (failure.kind !== 'already') {
          handleFailure(e, failure)
          return
        }
      }
      setNicknameSaved(true)
    }

    try {
      await updatePositions(positions)
    } catch (e) {
      handleFailure(e, describePositionsFailure(e))
      return
    }

    markOnboarded()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.logo}>FOOTY</p>
          <button type="button" className={styles.logout} onClick={signOut}>
            <LogoutIcon size={18} />
            로그아웃
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.body}>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>처음 오셨네요</p>
              <h1 className={styles.title}>경기에서 불릴 이름을 정해 주세요</h1>
              <p className={styles.lead}>닉네임은 참가 선수 목록, 투표, 평가에 그대로 보여요.</p>
            </div>

            <section className={styles.section}>
              <Field
                ref={nicknameInput}
                label="닉네임"
                aside={`${nicknameLength(nickname)} / ${NICKNAME_MAX}`}
                hint={nicknameSaved ? '저장됐어요.' : NICKNAME_HINT}
                error={nicknameError}
                aria-invalid={nicknameTaken ? 'true' : undefined}
                aria-describedby={nicknameTaken ? 'nickname-taken' : undefined}
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value)
                  if (error?.field === 'nickname') setError(null)
                }}
                readOnly={nicknameSaved}
                autoComplete="nickname"
                autoFocus
              />
              {nicknameTaken && (
                <StateCard
                  compact
                  tone="danger"
                  icon={<UserIcon size={22} />}
                  title="이미 쓰는 닉네임이에요"
                  actions={
                    <>
                      <Button variant="secondary" fit="auto" onClick={retypeNickname}>
                        다른 닉네임 입력
                      </Button>
                      <span className={styles.code}>MEMBER_409_2</span>
                    </>
                  }
                  id="nickname-taken"
                  role="alert"
                >
                  다른 사람이 쓰고 있어요. 탈퇴한 회원의 닉네임도 쓸 수 없어요.
                </StateCard>
              )}
            </section>

            <section className={styles.section}>
              <PositionPicker
                legend="선호 포지션"
                hint={POSITIONS_HINT}
                value={positions}
                onChange={(next) => {
                  setPositions(next)
                  if (error?.field === 'positions') setError(null)
                }}
                invalid={error?.field === 'positions'}
              />
            </section>
          </div>

          <div className={styles.actions}>
            <ErrorMessage>{formError}</ErrorMessage>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? '저장 중…' : 'FOOTY 시작하기'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
