import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || ''

export default function PrintApplication() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const ref       = state?.ref

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const downloadPdf = async () => {
    const res = await fetch(`${BASE}/api/v1/applications/${encodeURIComponent(ref)}/pdf`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to download PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `application-${ref}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!ref) { navigate('/application', { replace: true }); return }
    downloadPdf()
      .catch(() => setError('Failed to generate PDF. Please try again.'))
      .finally(() => setLoading(false))
  }, [ref, navigate])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Generating PDF…</div>
  if (error)   return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <p style={{ color: 'var(--ojas-red)' }}>{error}</p>
      <button className="btn primary" onClick={() => downloadPdf().catch(() => setError('Failed again.'))}>Retry Download</button>
      <button className="btn" style={{ marginLeft: 8 }} onClick={() => navigate('/application')}>← Back</button>
    </div>
  )

  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <p>Your application PDF has been downloaded.</p>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn primary" onClick={() => downloadPdf()}>Download Again</button>
        <button className="btn" onClick={() => navigate('/application')}>← Back to Applications</button>
      </div>
    </div>
  )
}
