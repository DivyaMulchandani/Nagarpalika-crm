import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../../api/index'
import { useAuth } from '../../context/AuthContext'

const statusColor = { pending: 'var(--ojas-saffron-deep)', paid: '#2a7a2a', failed: 'var(--ojas-red)' }
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '—'
const fmtRs   = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
const REG_ID_RE = /^[A-Z0-9/-]{4,30}$/

export default function FeeStatus() {
  const { user } = useAuth()
  // The server redirects here after a payment it could not settle outright,
  // carrying why. Without reading these the candidate just landed on a blank
  // lookup form with no idea what happened to their money.
  const [params] = useSearchParams()
  const returnReason = params.get('reason')
  const returnRef    = params.get('ref')

  const [regId, setRegId]     = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError]     = useState(null)

  // Keyboard restriction: uppercase letters, digits, / and - only
  const handleRegIdChange = (e) => {
    setRegId(e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 30))
    setError(null)
  }

  const handleCheck = async (e) => {
    e.preventDefault()
    if (!REG_ID_RE.test(regId.trim())) {
      setError('Enter a valid Registration ID (letters, digits, / and - only).')
      toast.warn('Enter a valid Registration ID.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      // POST, not GET — the lookup takes a body so the Registration ID never
      // lands in a query string, access log, or browser history.
      const res = await post('/api/v1/fee-payments/status', { registration_id: regId.trim() })
      setResults(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.message || 'Could not fetch fee status.')
      toast.error(err.message || 'Could not fetch fee status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link to="/" className="btn-back">← Back to Home</Link>

      <div className="page-heading">
        <h1>Fee Payment Status</h1>
        <span className="guj">ફી ચૂકવણી સ્થિતિ</span>
      </div>

      {returnReason === 'pending' && (
        <div style={{ margin: '0 0 12px', padding: '10px 14px', border: '1px solid var(--ojas-saffron-deep)', borderLeft: '4px solid var(--ojas-saffron-deep)', background: '#fff8ec', borderRadius: 3 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#8a2a2a' }}>
            Your payment{returnRef ? <> for <span style={{ fontFamily: 'var(--font-mono)' }}>{returnRef}</span></> : ''} is being confirmed by the bank.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--ojas-ink-2, #3a3a3a)' }}>
            This is normal for net-banking and NEFT/RTGS, which can take up to a few working days to settle.
            Do not pay again — the status updates automatically once the bank confirms.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.7, color: 'var(--ojas-ink-3)', fontFamily: 'var(--font-guj)' }}>
            તમારી ચુકવણી બેંક દ્વારા ચકાસવામાં આવી રહી છે. ફરીથી ચુકવણી કરશો નહીં.
          </p>
        </div>
      )}

      <div className="box">
        <div className="box-title"><span>Check Fee Status</span></div>
        <div className="box-body">
          <form onSubmit={handleCheck}>
            <div className="form-row">
              <div className="form-field">
                <label>Registration ID *</label>
                <input type="text" placeholder="e.g. OTR2026001234" value={regId} onChange={handleRegIdChange} maxLength={30} autoComplete="off" />
              </div>
              {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Loading…' : 'Check Status'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {results && (
        <div className="box" style={{ marginTop: 12 }}>
          <div className="box-title"><span>Fee Status Results</span></div>
          {results.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ojas-ink-3)', fontSize: 13.5, lineHeight: 1.7 }}>
              No fee records found for this Registration ID.
              <br />
              A fee record appears here only after you start a payment. If you have just
              submitted an application, open <Link to="/applications" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>My Applications</Link> to pay.
            </div>
          ) : (
            <table className="ojas">
              <thead>
                <tr>
                  <th>Advertisement No.</th>
                  <th style={{ width: 100 }}>Amount</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 150 }}>Paid At</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{r.advt_no}</td>
                    <td>{fmtRs(r.amount)}</td>
                    <td><span style={{ fontWeight: 700, color: statusColor[r.status] || 'inherit' }}>{r.status?.toUpperCase()}</span></td>
                    <td style={{ fontSize: 12 }}>{fmtDate(r.paid_at)}</td>
                    <td>
                      {r.status === 'paid'
                        // The receipt endpoint needs a candidate session, so a
                        // direct link would hand a signed-out visitor a raw 401.
                        ? (user
                            ? <a href={`${import.meta.env.VITE_API_URL || ''}/api/v1/fee-payments/receipt/${r.payment_id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Receipt ▶</a>
                            : <Link to="/applications" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Log in for Receipt ▶</Link>)
                        : r.status === 'pending'
                          // Paying requires a signed-in candidate, so send them
                          // to My Applications rather than starting it here.
                          ? <Link to="/applications" className="btn primary" style={{ fontSize: 12, padding: '4px 10px' }}>Log in to Pay ▶</Link>
                          : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  )
}
