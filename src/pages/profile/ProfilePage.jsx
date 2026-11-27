import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getMyProfile, updatePositions } from '../../api/member.js'
import { useAuth } from '../../auth/useAuth.js'
import { Avatar } from '../../components/Avatar.jsx'
import { Button } from '../../components/Button.jsx'
import { LogoutIcon } from '../../components/Icons.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { PositionChips } from '../../components/PositionChips.jsx'
import { PositionPicker } from '../../components/PositionPicker.jsx'
import { isValidPositions } from '../../components/positions.js'
import { samePositions } from '../players/playerPositions.js'
import { formatRating, profileLoadMessage, savePositionsMessage, sortedPositions } from './profile.js'
import styles from './ProfilePage.module.css'

// 내 프로필(/profile, 시안 Profile): 회원 정보, 평점, 선호 포지션 수정, 로그아웃·회원 탈퇴.
// 평점은 경기 후 파티장에게 받은 평점의 평균이다(BE D-38·D-41). 평점을 받은 경기가 2개 미만이면 BE가 null을 준다.
export function ProfilePage() {
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null) // { key, profile } | { key, error }
  const current = result?.key === retryCount ? result : null

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

  let body
  if (!current) {
    body = (
      <p className={styles.message} role="status">
        프로필을 불러오는 중…
      </p>
    )
  } else if (current.error) {
    body = <ProfileError error={current.error} onRetry={() => setRetryCount((count) => count + 1)} />
  } else {
    body = <ProfileContent profile={current.profile} />
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>내 프로필</h1>
      {body}
    </main>
  )
}

function ProfileError({ error, onRetry }) {
  const { clearSession } = useAuth()

  // 탈퇴했거나 없는 회원이면 이 기기의 토큰을 지우고 다시 로그인하게 한다.
  if (error.code === 'MEMBER_404_1') {
    return (
      <div className={styles.message}>
        <ErrorMessage>회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.</ErrorMessage>
        <Button fit="auto" onClick={clearSession}>
          다시 로그인
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.message}>
      <ErrorMessage>{profileLoadMessage(error)}</ErrorMessage>
      <Button variant="secondary" fit="auto" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  )
}

function ProfileContent({ profile }) {
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const nickname = profile.nickname ?? ''

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <section className={styles.card} aria-label="회원 정보">
          <div className={styles.identity}>
            <Avatar name={nickname} size="lg" />
            <div className={styles.names}>
              <h2 className={styles.nickname}>{nickname}</h2>
              <p className={styles.email}>{profile.email}</p>
            </div>
          </div>
          <hr className={styles.divider} />
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>평점</dt>
              <dd>{formatRating(profile.rating)}</dd>
            </div>
            <div className={styles.stat}>
              <dt>로그인</dt>
              <dd>Google 계정</dd>
            </div>
          </dl>
          <p className={styles.note}>평점은 경기 후 파티장에게 받은 평점의 평균이에요. 닉네임은 아직 바꿀 수 없어요.</p>
        </section>

        <section className={styles.accountCard} aria-labelledby="account-title">
          <h2 id="account-title" className={styles.cardTitle}>
            계정
          </h2>
          <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
            <LogoutIcon size={18} />
            {signingOut ? '로그아웃 중…' : '로그아웃'}
          </Button>
          <Button as={Link} to="/withdraw" variant="subtle" className={styles.withdraw}>
            회원 탈퇴
          </Button>
        </section>
      </div>

      <PositionsCard profile={profile} />
    </div>
  )
}

// 선호 포지션을 고쳐 저장한다(PUT /members/me/positions, BE D-13). 순서가 곧 우선순위이고 1~4개다.
function PositionsCard({ profile }) {
  const { clearSession } = useAuth()
  const [saved, setSaved] = useState(() => sortedPositions(profile))
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null) // { message } | { error }
  const pending = useRef(false)
  const valid = isValidPositions(draft)
  const changed = !samePositions(draft, saved)

  async function handleSave() {
    if (pending.current || !valid || !changed) return
    pending.current = true
    setSaving(true)
    setResult(null)
    try {
      await updatePositions(draft)
      setSaved(draft)
      setResult({ message: '선호 포지션을 저장했어요.' })
    } catch (error) {
      if (error.code === 'MEMBER_404_1') {
        clearSession()
        return
      }
      setResult({ error: savePositionsMessage(error) })
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <section className={styles.positions} aria-labelledby="positions-title">
      <h2 id="positions-title" className={styles.sectionTitle}>
        선호 포지션
      </h2>
      <p className={styles.description}>
        누른 순서가 우선순위예요. 1~4개를 고를 수 있고, 경기에 참가할 때 기본값으로 들어가요.
      </p>
      <PositionPicker
        value={draft}
        onChange={(next) => {
          setDraft(next)
          setResult(null)
        }}
        legend="선호 포지션"
        hint={null}
        hideLegend
        columns="responsive"
        showOrder={false}
        disabled={saving}
        invalid={draft.length === 0}
      />
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>현재 순서</span>
        {draft.length === 0 ? (
          <span className={styles.orderEmpty}>아직 고르지 않았어요</span>
        ) : (
          <PositionChips positions={draft} />
        )}
        <Button fit="auto" className={styles.save} onClick={handleSave} disabled={saving || !valid || !changed}>
          {saving ? '저장하는 중…' : '포지션 저장'}
        </Button>
      </div>
      {draft.length === 0 && <ErrorMessage>선호 포지션을 1~4개 골라 주세요.</ErrorMessage>}
      {result?.message && (
        <p className={styles.saved} role="status">
          {result.message}
        </p>
      )}
      <ErrorMessage>{result?.error}</ErrorMessage>
    </section>
  )
}
