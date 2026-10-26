import { PageLayout } from './PageLayout.jsx'
import styles from './LoadingScreen.module.css'

export function LoadingScreen({ label = '불러오는 중…' }) {
  return (
    <PageLayout centered>
      <div className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <p>{label}</p>
      </div>
    </PageLayout>
  )
}
