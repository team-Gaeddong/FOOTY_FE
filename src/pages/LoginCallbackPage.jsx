import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { exchangeLoginCode } from '../api/auth.js'
import { useAuth } from '../auth/useAuth.js'
import { LoadingScreen } from '../components/LoadingScreen.jsx'

function toErrorKey(error) {
  if (error.code === 'AUTH_401_1') return 'code_expired'
  if (error.status === 0) return 'network'
  return 'unknown'
}

// BE가 OAUTH_REDIRECT_URI로 ?code= 또는 ?error=login_failed를 붙여 돌려보낸다(BE D-05d).
export function LoginCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  // 1회용 코드라 StrictMode에서 effect가 두 번 돌아도 한 번만 교환한다.
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const code = searchParams.get('code')
    if (!code) {
      navigate('/login', { replace: true, state: { error: 'login_failed' } })
      return
    }

    exchangeLoginCode(code)
      .then((tokens) => {
        signIn(tokens)
        navigate(tokens.onboarded ? '/' : '/onboarding', { replace: true })
      })
      .catch((error) => {
        navigate('/login', { replace: true, state: { error: toErrorKey(error) } })
      })
  }, [searchParams, navigate, signIn])

  return <LoadingScreen label="로그인 중…" />
}
