import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { get } from '../../api/index'
import { IconCheck } from '../../components/Icons'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const statusColor = { submitted: '#2a7a2a', under_review: 'var(--ojas-saffron-deep)', shortlisted: 'var(--ojas-navy)', rejected: 'var(--ojas-red)', selected: '#2a7a2a' }

export default function ApplicationEntry() {
  const navigate = useNavigate()
  const [myApps, setMyApps]   = useState(null)
  const [openAdvts, setOpen]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      get('/api/v1/applications/me', undefined, { silent401: true }).catch(() => null),
      get('/api/v1/advertisements', { limit: 50 }).catch(() => ({ data: [] })),
    ]).then(([appsRes, advtRes]) => {
      setMyApps(appsRes?.data ?? null)
      setOpen((advtRes?.data || []).filter(a => a.status === 'Published'))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>

  if (myApps === null) {
    return (
      <>
        <div className="page-heading"><h1>Apply Online</h1></div>
        <div className="notice warn">
          <div className="title">Login Required</div>
          Please <Link to="/registration/find" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>login with your Registration ID</Link> to apply for a post.
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-heading">
        <h1>Apply Online</h1>
        <span className="guj">ઓનલાઇન અરજી</span>
      </div>

      {myApps.length > 0 && (
        <div className="box" style={{ marginBottom: 16 }}>
          <div className="box-title"><span>Your Applications</span></div>
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th>Ref No.</th>
                <th>Advertisement</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 110 }}>Submitted</th>
                <th style={{ width: 80 }}>Print</th>
              </tr>
            </thead>
            <tbody>
              {myApps.map((a, i) => (
                <tr key={a.application_ref_no || i}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.application_ref_no}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.advt_no}</td>
                  <td><span style={{ fontWeight: 700, color: statusColor[a.status] || 'inherit', fontSize: 12 }}>{a.status?.replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(a.submitted_at)}</td>
                  <td><button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate('/application/print', { state: { ref: a.application_ref_no } })}>Print ▶</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="box">
        <div className="box-title"><span>Open Advertisements</span><span className="guj">ખુલ્લી જાહેરાતો</span></div>
        {openAdvts.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ojas-ink-3)' }}>No advertisements are currently accepting applications.</div>
        ) : (
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th style={{ width: 120 }}>Advt. No.</th>
                <th>Post</th>
                <th style={{ width: 70 }}>Fee</th>
                <th style={{ width: 100 }}>Last Date</th>
                <th style={{ width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {openAdvts.map((a, i) => {
                const alreadyApplied = myApps.some(ap => ap.advt_no === a.advt_no)
                return (
                  <tr key={a._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.advt_no}</td>
                    <td>{a.post_title?.en}</td>
                    <td>{a.application_fee ? `₹${a.application_fee}` : 'Free'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(a.end_date)}</td>
                    <td>
                      {alreadyApplied
                        ? <span style={{ color: '#2a7a2a', fontSize: 12, fontWeight: 700 }}>Applied <IconCheck /></span>
                        : <button className="btn primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/application/apply', { state: { advt: a } })}>Apply ▶</button>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
