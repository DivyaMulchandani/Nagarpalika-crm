import { useState, useEffect } from 'react'
import { get } from '../api/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const TYPE_FILTERS = [
  { k: 'all',        l: 'All' },
  { k: 'general',    l: 'General' },
  { k: 'recruitment',l: 'Recruitment' },
  { k: 'tender',     l: 'Tender' },
  { k: 'result',     l: 'Result' },
]

const TYPE_LABEL = { general: 'General', recruitment: 'Recruit', tender: 'Tender', result: 'Result' }

export default function Notices() {
  const [filter, setFilter]   = useState('all')
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    get('/api/v1/notices', { status: 'published', limit: 50 })
      .then(res => setNotices(res?.data || []))
      .catch(() => setError('Failed to load notices'))
      .finally(() => setLoading(false))
  }, [])

  const visible  = filter === 'all' ? notices : notices.filter(n => n.type === filter)
  const countOf  = (k) => k === 'all' ? notices.length : notices.filter(n => n.type === k).length

  return (
    <>
      <div className="page-heading">
        <h1>Notices, Circulars &amp; Public Communications</h1>
        <span className="guj">સૂચનાઓ, પરિપત્રો અને જાહેર સંદેશાઓ</span>
      </div>

      <div className="filter-row">
        <span className="label">Filter by Type</span>
        {TYPE_FILTERS.map(f => (
          <button
            key={f.k}
            className={`chip${filter === f.k ? ' active' : ''}`}
            onClick={() => setFilter(f.k)}
          >
            {f.l} <span className="count">({countOf(f.k)})</span>
          </button>
        ))}
      </div>

      <div className="box">
        <div className="box-title">
          <span>Recent Notices &amp; Circulars</span>
          <span className="guj">તાજેતરની સૂચનાઓ</span>
        </div>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ojas-ink-3)' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ojas-red)' }}>{error}</div>
        ) : (
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th style={{ width: 110 }}>Date</th>
                <th>Subject</th>
                <th style={{ width: 100 }}>Type</th>
                <th style={{ width: 80 }}>File</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((n, i) => (
                <tr key={n._id}>
                  <td>{i + 1}</td>
                  <td>{fmtDate(n.publish_date)}</td>
                  <td>
                    {n.is_important_instruction && <span style={{ color: 'var(--ojas-red)', fontWeight: 700, marginRight: 4 }}>★</span>}
                    {n.title}
                  </td>
                  <td><span className={`tag ${n.type}`}>{TYPE_LABEL[n.type] || n.type}</span></td>
                  <td>
                    {n.pdf_path
                      ? <a href={`${import.meta.env.VITE_API_URL || ''}/api/v1/notices/${n._id}/pdf`} target="_blank" rel="noreferrer">PDF ▶</a>
                      : <span style={{ color: 'var(--ojas-ink-3)' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>No notices found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
