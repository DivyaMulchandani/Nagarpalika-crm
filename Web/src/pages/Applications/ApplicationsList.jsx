import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { get } from '../../api/index'
import { startEasyPayPayment } from '../../api/easypay'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const statusColor = { submitted: '#2a7a2a', under_review: 'var(--ojas-saffron-deep)', shortlisted: 'var(--ojas-navy)', rejected: 'var(--ojas-red)', selected: '#2a7a2a' }

export default function ApplicationsList() {
  const navigate = useNavigate()
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fees, setFees] = useState({})
  const [paying, setPaying] = useState(null)

  useEffect(() => {
    get('/api/v1/applications/me', undefined, { silent401: true })
      .then((res) => setApps(res?.data ?? []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  // Fee rows are keyed by application ref so each row can show its own state.
  useEffect(() => {
    get('/api/v1/fee-payments/me', undefined, { silent401: true })
      .then((res) => {
        const byRef = {}
        for (const f of res?.data ?? []) byRef[f.application_ref_no] = f
        setFees(byRef)
      })
      .catch(() => setFees({}))
  }, [])

  const handlePay = async (refNo) => {
    setPaying(refNo)
    try {
      // Only returns if the redirect to the bank didn't happen.
      await startEasyPayPayment(refNo)
    } catch (err) {
      toast.error(err.message || 'Payment could not be started.')
    } finally {
      setPaying(null)
    }
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>

  return (
    <>
      <div className="page-heading">
        <h1>My Applications</h1>
        <span className="guj">મારી અરજીઓ</span>
      </div>

      {apps.length > 0 && apps.some((a) => fees[a.application_ref_no]?.status !== 'paid') && (
        <div style={{ margin: '0 0 12px', padding: '10px 14px', border: '1px solid var(--ojas-saffron-deep)', borderLeft: '4px solid var(--ojas-saffron-deep)', background: '#fff8ec', borderRadius: 3 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#8a2a2a' }}>
            While paying, do not close the window, press Back, or refresh. You will be returned to this portal automatically once the payment is complete.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--ojas-ink-2, #3a3a3a)' }}>
            ચુકવણી દરમિયાન વિન્ડો બંધ કરશો નહીં, બેક દબાવશો નહીં કે રિફ્રેશ કરશો નહીં. ચુકવણી પૂર્ણ થયા બાદ તમને આપમેળે પોર્ટલ પર પાછા લાવવામાં આવશે.
          </p>
        </div>
      )}

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
                <th style={{ width: 120 }}>Fee</th>
                <th style={{ width: 90 }}>View</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => {
                const fee = fees[a.application_ref_no]
                return (
                <tr key={a.application_ref_no || i}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.application_ref_no}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.advt_no}</td>
                  <td><span style={{ fontWeight: 700, color: statusColor[a.status] || 'inherit', fontSize: 12 }}>{a.status?.replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(a.submitted_at)}</td>
                  <td>
                    {fee?.status === 'paid'
                      ? <span style={{ fontWeight: 700, color: '#2a7a2a', fontSize: 12 }}>PAID</span>
                      : <button
                          className="btn primary"
                          style={{ fontSize: 11, padding: '3px 8px' }}
                          onClick={() => handlePay(a.application_ref_no)}
                          disabled={paying === a.application_ref_no}
                        >
                          {paying === a.application_ref_no ? 'Opening…' : 'Pay Fee ▶'}
                        </button>
                    }
                  </td>
                  <td><button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate(`/applications/${encodeURIComponent(a.application_ref_no)}`)}>View ▶</button></td>
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
