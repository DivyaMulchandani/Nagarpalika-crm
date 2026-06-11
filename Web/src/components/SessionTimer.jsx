import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconClock } from './Icons'

const SESSION_MS = 30 * 60 * 1000 // mirrors the server's 30-min absolute session

// Fixed bar at the bottom of the page showing how long the candidate's
// session has left. The session is ABSOLUTE: it expires exactly 30 minutes
// after login (server-enforced), so the countdown is seeded from the
// server's session_expires_at and is never reset by refreshes or activity.
export default function SessionTimer() {
  const { user, logout, sessionExpiresAt } = useAuth()
  const [expiresAt, setExpiresAt] = useState(null)
  const [now, setNow] = useState(Date.now())

  // Seed (and re-seed) from the server-reported expiry
  useEffect(() => {
    if (!user) { setExpiresAt(null); return }
    setExpiresAt(sessionExpiresAt || Date.now() + SESSION_MS)
  }, [user, sessionExpiresAt])

  useEffect(() => {
    if (!user) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [user])

  // Expired — drop the local login state
  useEffect(() => {
    if (user && expiresAt && now >= expiresAt) logout()
  }, [user, expiresAt, now, logout])

  if (!user || !expiresAt) return null

  const left = Math.max(0, expiresAt - now)
  const mins = Math.floor(left / 60000)
  const secs = Math.floor((left % 60000) / 1000)
  const warning = left < 5 * 60 * 1000

  return (
    <div className={`session-timer no-print${warning ? ' warning' : ''}`} role="status" aria-live="polite">
      <IconClock />
      <span>
        Session expires in <strong>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</strong>
        {warning && ' — please finish and save your work'}
      </span>
    </div>
  )
}
