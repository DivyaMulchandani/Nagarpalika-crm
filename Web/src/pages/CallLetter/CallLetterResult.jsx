import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { post } from '../../api/index'

const BASE = import.meta.env.VITE_API_URL || ''

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function CallLetterResult() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const results   = state?.results || []
  const regId     = state?.regId   || ''
  const dob       = state?.dob     || ''
  const [downloading, setDownloading] = useState({})
  const [dlError, setDlError] = useState({})

  if (!state) {
    navigate('/callletter', { replace: true })
    return null
  }

  const handleDownload = async (advt_no) => {
    setDownloading((p) => ({ ...p, [advt_no]: true }))
    setDlError((p) => ({ ...p, [advt_no]: null }))
    try {
      const checkRes = await post('/api/v1/call-letters/check', { registration_id: regId, dob, advt_no })
      if (!checkRes.eligible) {
        setDlError((p) => ({ ...p, [advt_no]: 'Not eligible for download' }))
        return
      }
      const pdfRes = await fetch(`${BASE}/api/v1/call-letters/${encodeURIComponent(advt_no)}/download`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: checkRes.token }),
      })
      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({}))
        setDlError((p) => ({ ...p, [advt_no]: err.message || 'Download failed' }))
        return
      }
      const blob = await pdfRes.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `admit-card-${regId}-${advt_no.replace(/\//g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setDlError((p) => ({ ...p, [advt_no]: err.message || 'Download failed' }))
    } finally {
      setDownloading((p) => ({ ...p, [advt_no]: false }))
    }
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
                <th style={{ width: 110 }}>Download</th>
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
                    <button
                      className="btn primary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={!!downloading[r.advt_no]}
                      onClick={() => handleDownload(r.advt_no)}
                    >
                      {downloading[r.advt_no] ? '…' : 'PDF ▶'}
                    </button>
                    {dlError[r.advt_no] && (
                      <div style={{ color: 'var(--ojas-red)', fontSize: 11, marginTop: 2 }}>{dlError[r.advt_no]}</div>
                    )}
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
