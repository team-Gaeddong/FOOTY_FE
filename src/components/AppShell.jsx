import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { getMyProfile } from '../api/members.js'
import styles from './AppShell.module.css'
import { Avatar } from './Avatar.jsx'
import { Button } from './Button.jsx'
import { ArrowLeftIcon, ListIcon, PlusIcon, ShieldIcon, UserIcon } from './NavIcons.jsx'
import { matchRoute, mobileChrome } from './navigation.js'

const TABS = [
  { id: 'games', label: '경기', to: '/', Icon: ListIcon },
  { id: 'mine', label: '내 경기', to: '/games/mine', Icon: ShieldIcon },
  { id: 'create', label: '만들기', to: '/games/new', Icon: PlusIcon },
  { id: 'profile', label: '프로필', to: '/profile', Icon: UserIcon },
]

// 로그인 후 모든 화면에 걸리는 내비게이션. PC는 상단 헤더, 모바일은 최상위 화면에 로고 바 + 하단 탭,
// 하위 화면에는 뒤로 가기 + 제목 바다(경로별 구성은 navigation.js의 표).
// 프로필은 헤더의 닉네임·아바타에만 쓰고, 못 불러와도 내비게이션은 그대로 동작한다.
export function AppShell() {
  const { pathname } = useLocation()
  const route = matchRoute(pathname)
  const chrome = mobileChrome(route)
  const [profile, setProfile] = useState({ status: 'loading', nickname: null })

  useEffect(() => {
    let active = true
    getMyProfile()
      .then((data) => {
        if (active) setProfile({ status: 'ready', nickname: data.nickname ?? null })
      })
      .catch(() => {
        if (active) setProfile({ status: 'error', nickname: null })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={styles.shell} data-chrome={chrome}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo} aria-label="FOOTY 홈">
            FOOTY
          </Link>
          <nav className={styles.menu} aria-label="주 메뉴">
            <Link
              to="/"
              className={styles.menuLink}
              aria-current={route.current === 'games' ? 'page' : undefined}
            >
              경기
            </Link>
            <Link
              to="/games/mine"
              className={styles.menuLink}
              aria-current={route.current === 'mine' ? 'page' : undefined}
            >
              내 경기
            </Link>
          </nav>
          <div className={styles.actions}>
            <Button as={Link} to="/games/new" fit="auto" className={styles.create}>
              <PlusIcon size={18} />
              경기 만들기
            </Button>
            <Link to="/profile" className={styles.profile} aria-label="내 프로필">
              {profile.status === 'loading' ? (
                <span className={styles.avatarPlaceholder} aria-hidden="true" />
              ) : (
                <Avatar name={profile.nickname} />
              )}
              {profile.nickname && <span className={styles.profileName}>{profile.nickname}</span>}
            </Link>
          </div>
        </div>
      </header>

      {chrome === 'bar' && (
        <div className={styles.subBar}>
          <Link to={route.back} className={styles.back} aria-label="뒤로">
            <ArrowLeftIcon />
          </Link>
          <p className={styles.subTitle}>{route.title}</p>
        </div>
      )}

      <div className={styles.content}>
        <Outlet />
      </div>

      <nav className={styles.tabs} aria-label="주 메뉴">
        {TABS.map(({ id, label, to, Icon }) => (
          <Link
            key={id}
            to={to}
            className={styles.tab}
            aria-current={route.current === id ? 'page' : undefined}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
