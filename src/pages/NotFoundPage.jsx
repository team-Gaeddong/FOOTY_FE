import { Link } from 'react-router'
import { PageLayout } from '../components/PageLayout.jsx'

export function NotFoundPage() {
  return (
    <PageLayout centered>
      <h1>페이지를 찾을 수 없습니다</h1>
      <Link to="/">처음으로</Link>
    </PageLayout>
  )
}
