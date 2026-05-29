import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { get } from '../../api/index'

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '—'

export default function PrintApplication() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const ref       = state?.ref

  const [app, setApp]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!ref) { navigate('/application', { replace: true }); return }
    get(`/api/v1/applications/${encodeURIComponent(ref)}`)
      .then(res => setApp(res?.data))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [ref, navigate])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>
  if (error)   return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ojas-red)' }}>{error}</div>
  if (!app)    return null

  return (
    <>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Application Printout</h1>
          <span className="guj">અરજી પ્રિન્ટ</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => window.print()}>Print</button>
          <button className="btn" onClick={() => navigate('/application')}>← Back</button>
        </div>
      </div>

      <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="box-title"><span>Application — {app.advt_no}</span></div>
        <div className="box-body">
          <table className="ojas kv">
            <tbody>
              <tr><td style={{ width: 200, color: 'var(--ojas-ink-3)' }}>Application Ref No.</td><td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{app.application_ref_no}</td></tr>
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Advertisement No.</td><td style={{ fontFamily: 'var(--font-mono)' }}>{app.advt_no}</td></tr>
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Status</td><td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{app.status?.replace(/_/g, ' ')}</td></tr>
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Submitted At</td><td>{fmtDate(app.submitted_at)}</td></tr>
              {app.candidate && (
                <>
                  <tr><td colSpan={2} style={{ background: 'var(--ojas-cream)', fontWeight: 700, fontSize: 12, paddingTop: 10 }}>Candidate Details</td></tr>
                  <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Registration ID</td><td style={{ fontFamily: 'var(--font-mono)' }}>{app.candidate.registration_id}</td></tr>
                  <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Name</td><td>{app.candidate.name_en}</td></tr>
                  {app.candidate.name_gu && <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Name (Gujarati)</td><td style={{ fontFamily: 'var(--font-guj)' }}>{app.candidate.name_gu}</td></tr>}
                  <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Category</td><td>{app.candidate.category}</td></tr>
                </>
              )}
            </tbody>
          </table>
          <div className="notice warn" style={{ marginTop: 16, fontSize: 12 }}>
            This is a system-generated printout. Keep it for your records. For examination hall tickets, visit the Call Letter section.
          </div>
        </div>
      </div>
    </>
  )
}
