import styles from './PageLayout.module.css'

// 한 열 레이아웃. 화면마다 폭을 따로 정하는 이슈(③~⑭)에서 content 폭을 넓혀 간다. 여백은 반응형 토큰을 따른다.
export function PageLayout({ children, centered = false }) {
  return (
    <main className={`${styles.page} ${centered ? styles.centered : ''}`}>
      <div className={styles.content}>{children}</div>
    </main>
  )
}
