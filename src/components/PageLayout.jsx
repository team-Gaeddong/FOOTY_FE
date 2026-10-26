import styles from './PageLayout.module.css'

// 모바일 기준 한 열 레이아웃. 화면 디자인 원본은 아직 없다(FD-09).
export function PageLayout({ children, centered = false }) {
  return (
    <main className={`${styles.page} ${centered ? styles.centered : ''}`}>
      <div className={styles.content}>{children}</div>
    </main>
  )
}
