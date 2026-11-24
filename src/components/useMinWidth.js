import { useSyncExternalStore } from 'react'

// 화면 폭이 px 이상인지(CSS min-width 미디어 쿼리와 같다). 폭이 바뀌면 다시 그린다.
// CSS로만 나눌 수 없는, 구조가 다른 두 화면(PC 두 열 / 모바일 펼침 목록)을 고를 때 쓴다.
export function useMinWidth(px) {
  const query = `(min-width: ${px}px)`
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
