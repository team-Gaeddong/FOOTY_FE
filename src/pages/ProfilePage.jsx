import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client.js'
import { getMyProfile } from '../api/member.js'
import { useAuth } from '../auth/useAuth.js'
import { POSITION_LABELS } from '../components/positions.js'
import { PageLayout } from '../components/PageLayout.jsx'
import styles from './ProfilePage.module.css'

// BE rating은 BigDecimal(소수 둘째 자리)이라 JSON 숫자로 온다.
function formatRating(rating) {
  const value = Number(rating)
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

function errorMessage(error) {
  if (!(error instanceof ApiError)) return '프로필을 불러오지 못했습니다.'
  if (error.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  // 토큰의 onboarded와 DB가 어긋난 경우. BE는 DB 기준으로 막는다(BE D-05e).
  // 온보딩 화면은 토큰 기준으로 홈으로 돌려보내므로 이동하지 않고 안내만 한다.
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 프로필을 볼 수 있어요.'
  return '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 내 프로필 조회(GET /members/me). 디자인은 Figma 디자인시스템 토큰(--ds-*)을 따른다(FD-09).
export function ProfilePage() {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const currentResult = result?.key === retryCount ? result : null

  useEffect(() => {
    let active = true
    getMyProfile()
      .then((profile) => {
        if (active) setResult({ key: retryCount, profile })
      })
      .catch((error) => {
        if (active) setResult({ key: retryCount, error })
      })
    return () => {
      active = false
    }
  }, [retryCount])

  return (
    <PageLayout>
      <div className={styles.page}>
        <nav>
          <Link className={styles.backLink} to="/">
            <span aria-hidden="true">←</span> 홈으로
          </Link>
        </nav>
        <h1 className={styles.title}>내 프로필</h1>

        {!currentResult ? (
          <div className={styles.status} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <p>프로필을 불러오는 중…</p>
          </div>
        ) : currentResult.error ? (
          <ProfileError
            error={currentResult.error}
            onRetry={() => setRetryCount((count) => count + 1)}
          />
        ) : (
          <ProfileContent profile={currentResult.profile} />
        )}
      </div>
    </PageLayout>
  )
}

function ProfileError({ error, onRetry }) {
  const { clearSession } = useAuth()

  // 탈퇴했거나 없는 회원이면 이 기기의 토큰을 지우고 다시 로그인하게 한다.
  if (error.code === 'MEMBER_404_1') {
    return (
      <section className={styles.panel}>
        <p className={styles.errorText} role="alert">
          회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.
        </p>
        <button type="button" className={styles.primaryButton} onClick={clearSession}>
          다시 로그인
        </button>
      </section>
    )
  }

  return (
    <section className={styles.panel}>
      <p className={styles.errorText} role="alert">
        {errorMessage(error)}
      </p>
      <button type="button" className={styles.tertiaryButton} onClick={onRetry}>
        다시 시도
      </button>
    </section>
  )
}

function ProfileContent({ profile }) {
  const nickname = profile.nickname ?? ''
  const initial = [...nickname.trim()][0] ?? '?'

  return (
    <>
      <section className={styles.card} aria-label="회원 정보">
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div className={styles.names}>
            <p className={styles.nickname}>{nickname}</p>
            <p className={styles.email}>{profile.email}</p>
          </div>
        </div>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>실력 점수</dt>
            <dd>{formatRating(profile.rating)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="profile-positions">
        <h2 id="profile-positions" className={styles.sectionTitle}>
          선호 포지션
        </h2>
        {profile.positions.length === 0 ? (
          <p className={styles.empty}>아직 선호 포지션을 고르지 않았어요.</p>
        ) : (
          <ol className={styles.tags}>
            {profile.positions.map(({ position, priority }) => (
              <li
                key={position}
                className={`${styles.tag} ${priority === 1 ? styles.tagFirst : ''}`}
              >
                <span className={styles.priority}>{priority}순위</span>
                {POSITION_LABELS[position] ?? position}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
