import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { get, post } from '../api/index'

const AuthContext = createContext({ user: null, loading: true })

// Session persistence: the session itself lives server-side in MongoDB with a
// 30-minute sliding window. On every app load we re-hydrate the login state
// from GET /candidates/me, so a refresh (or new tab) keeps the user logged in
// until the server session expires.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Real expiry timestamp of the server session (ms epoch) — reported by
  // /candidates/me so the timer survives page refreshes in sync.
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await get('/api/v1/candidates/me', undefined, { silent401: true })
      const c = res?.data
      setUser(c ? { registration_id: c.registration_id, name: c.name } : null)
      setSessionExpiresAt(
        c && res?.session_expires_at ? new Date(res.session_expires_at).getTime() : null,
      )
    } catch {
      setUser(null)
      setSessionExpiresAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try { await post('/api/v1/candidates/auth/logout') } catch { /* session may already be gone */ }
    setUser(null)
    setSessionExpiresAt(null)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // The api layer dispatches this whenever any request hits a 401,
  // so the header/login state never shows a stale "logged in" user.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth:unauthorized', onExpired)
    return () => window.removeEventListener('auth:unauthorized', onExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, sessionExpiresAt }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
