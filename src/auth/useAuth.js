import { useContext } from 'react'
import { AuthContext } from './authContext.js'

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  return auth
}
