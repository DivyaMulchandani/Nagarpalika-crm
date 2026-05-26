import { useState } from 'react'
import { get, post } from '../../api/index'

const statusColor = { pending: 'var(--ojas-saffron-deep)', paid: '#2a7a2a', failed: 'var(--ojas-red)' }
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '—'
const fmtRs   = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

export default function FeeStatus() {
  const [regId, setRegId]     = useState('')
  const [loading, setLoading] = useState(false)
  const [paying, setPaying]   = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError]     = useState(null)

  const handleCheck = async (e) => {
    e.preventDefault()
    if (!regId.trim()) { setError('Please enter your Registration ID.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await get('/api/v1/fee-payments/status', { registration_id: regId.trim() })
      setResults(res.data || [])
    } catch (err) {
      setError(err.message || 'Could not fetch fee status.')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (advtNo) => {
    setPaying(advtNo)
    try {
      const res = await post('/api/v1/fee-payments/initiate', { registration_id: regId.trim(), advt_no: advtNo })
      const { order_id, amount, key } = res.data
      const rzp = new window.Razorpay({
        key, amount, order_id,
        name: 'Nagar Palika Recruitment',
        description: `Fee for ${advtNo}`,
        handler: () => { window.location.href = '/fee/success' },
        modal: { ondismiss: () => { window.location.href = '/fee/failure' } },
      })
      rzp.open()
    } catch (err) {
      alert(err.message || 'Payment initiation failed.')
    } finally {
      setPaying(null)
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Fee Payment Status</h1>
        <span className="guj">ફી ચૂકવણી સ્થિતિ</span>
      </div>

      <div className="box">
        <div className="box-title"><span>Check Fee Status</span></div>
        <div className="box-body">
          <form onSubmit={handleCheck}>
            <div className="form-row">
              <div className="form-field">
                <label>Registration ID *</label>
                <input type="text" placeholder="e.g. OTR2026001234" value={regId} onChange={(e) => setRegId(e.target.value)} autoComplete="off" />
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
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ojas-ink-3)' }}>No fee records found for this Registration ID.</div>
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
                        ? <a href={`/api/v1/fee-payments/${r.payment_id}/receipt`} target="_blank" rel="noreferrer" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Receipt ▶</a>
                        : r.status === 'pending'
                          ? <button className="btn primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handlePay(r.advt_no)} disabled={paying === r.advt_no}>{paying === r.advt_no ? 'Opening…' : 'Pay Now'}</button>
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
