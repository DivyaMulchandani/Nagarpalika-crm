import { useLocation, useNavigate } from 'react-router-dom'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function CallLetterResult() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const results   = state?.results || []
  const regId     = state?.regId   || ''

  if (!state) {
    navigate('/callletter', { replace: true })
    return null
  }

  return (
    <>
      <div className="page-heading">
        <h1>Call Letter Results</h1>
        <span className="guj">પ્રવેશ પત્ર પરિણામ</span>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--ojas-ink-2)' }}>
        Showing call letters for Registration ID:{' '}
        <strong style={{ fontFamily: 'var(--font-mono)' }}>{regId}</strong>
      </div>

      {results.length === 0 ? (
        <div className="notice warn">
          <div className="title">No Call Letters Found</div>
          No enabled call letters were found for this Registration ID. Please ensure fee payment is complete and the exam authority has enabled your call letter.
        </div>
      ) : (
        <div className="box">
          <div className="box-title">
            <span>Your Call Letters</span>
            <span className="guj">તમારા કોલ લેટર</span>
          </div>
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th style={{ width: 130 }}>Advertisement No.</th>
                <th>Post</th>
                <th style={{ width: 110 }}>Exam Date</th>
                <th style={{ width: 90 }}>Time</th>
                <th>Venue</th>
                <th style={{ width: 130 }}>Roll No.</th>
                <th style={{ width: 100 }}>Download</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{r.advt_no}</td>
                  <td>{r.post_title?.en || r.post_title || '—'}</td>
                  <td>{fmtDate(r.exam_date)}</td>
                  <td>{r.exam_time || '—'}</td>
                  <td style={{ fontSize: 12 }}>{r.venue || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.roll_number || '—'}</td>
                  <td>
                    {r.enabled
                      ? <a href={`/api/v1/call-letters/${encodeURIComponent(r.advt_no)}/download?registration_id=${regId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>PDF ▶</a>
                      : <span style={{ color: 'var(--ojas-ink-3)', fontSize: 12 }}>Not available</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => navigate('/callletter')}>← Back</button>
      </div>
    </>
  )
}
