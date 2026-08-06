import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../../api/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const statusColor = { submitted: '#2a7a2a', under_review: 'var(--ojas-saffron-deep)', shortlisted: 'var(--ojas-navy)', rejected: 'var(--ojas-red)', selected: '#2a7a2a' }

export default function ApplicationsList() {
  const navigate = useNavigate()
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/v1/applications/me', undefined, { silent401: true })
      .then((res) => setApps(res?.data ?? []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>

  return (
    <>
      <div className="page-heading">
        <h1>My Applications</h1>
        <span className="guj">મારી અરજીઓ</span>
      </div>

      <div className="box">
        <div className="box-title"><span>Applications</span></div>
        {apps.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ojas-ink-3)' }}>You haven't submitted any applications yet.</div>
        ) : (
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th>Ref No.</th>
                <th>Advertisement</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 110 }}>Submitted</th>
                <th style={{ width: 90 }}>View</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr key={a.application_ref_no || i}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.application_ref_no}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.advt_no}</td>
                  <td><span style={{ fontWeight: 700, color: statusColor[a.status] || 'inherit', fontSize: 12 }}>{a.status?.replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(a.submitted_at)}</td>
                  <td><button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate(`/applications/${encodeURIComponent(a.application_ref_no)}`)}>View ▶</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
