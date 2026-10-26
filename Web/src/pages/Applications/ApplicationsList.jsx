import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { get } from '../../api/index'
import { startEasyPayPayment, downloadFeeReceipt } from '../../api/easypay'

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const statusColor = { pending_payment: 'var(--ojas-red)', submitted: '#2a7a2a', under_review: 'var(--ojas-saffron-deep)', shortlisted: 'var(--ojas-navy)', rejected: 'var(--ojas-red)', selected: '#2a7a2a' }

export default function ApplicationsList() {
  const navigate = useNavigate()
  // Set by the server when the bank answered "pending" for a payment.
  const [params] = useSearchParams()
  const pendingRef = params.get('reason') === 'pending' ? params.get('ref') : null
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fees, setFees] = useState({})
  // When a "pending at bank" hold lifts, per application. Tracked across ALL of
  // an application's rows: the held row is not necessarily the one shown.
  const [holds, setHolds] = useState({})
  const [paying, setPaying] = useState(null)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    get('/api/v1/applications/me', undefined, { silent401: true })
      .then((res) => setApps(res?.data ?? []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  // Fee rows are keyed by application ref so each row can show its own state.
  // An application can own several rows — a failed attempt leaves its row
  // behind and the retry starts a new one — so pick the one that decides the
  // row: a paid attempt if there is one, otherwise the most recent. Keeping
  // whichever happened to come last meant a candidate who paid on their second
  // attempt still saw "Pay Fee", and clicking it was rejected as already paid.
  useEffect(() => {
    get('/api/v1/fee-payments/me', undefined, { silent401: true })
      .then((res) => {
        const byRef = {}
        const holdByRef = {}
        // The API returns newest first.
        for (const f of res?.data ?? []) {
          const kept = byRef[f.application_ref_no]
          if (!kept || (kept.status !== 'paid' && f.status === 'paid')) {
            byRef[f.application_ref_no] = f
          }
          if (f.payment_hold_until) {
            const prev = holdByRef[f.application_ref_no]
            if (!prev || new Date(f.payment_hold_until) > new Date(prev))
              holdByRef[f.application_ref_no] = f.payment_hold_until
          }
        }
        setFees(byRef)
        setHolds(holdByRef)
      })
      .catch(() => setFees({}))
  }, [])

  const handleReceipt = async (paymentId) => {
    setDownloading(paymentId)
    try {
      await downloadFeeReceipt(paymentId)
    } catch (err) {
      toast.error(err.message || 'Could not download the receipt.')
    } finally {
      setDownloading(null)
    }
  }

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

      {pendingRef && (
        <div style={{ margin: '0 0 12px', padding: '10px 14px', border: '1px solid var(--ojas-saffron-deep)', borderLeft: '4px solid var(--ojas-saffron-deep)', background: '#fff8ec', borderRadius: 3 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#8a2a2a' }}>
            Your payment for <span style={{ fontFamily: 'var(--font-mono)' }}>{pendingRef}</span> is being confirmed by the bank.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--ojas-ink-2, #3a3a3a)' }}>
            This is normal for net banking and NEFT/RTGS. <strong>Do not pay again</strong> — the fee will show as PAID below automatically once the bank confirms.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.7, color: 'var(--ojas-ink-3)', fontFamily: 'var(--font-guj)' }}>
            તમારી ચુકવણી બેંક દ્વારા ચકાસવામાં આવી રહી છે. ફરીથી ચુકવણી કરશો નહીં.
          </p>
        </div>
      )}

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
                      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, color: '#2a7a2a', fontSize: 12 }}>PAID</span>
                          <button
                            className="btn"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => handleReceipt(fee.payment_id)}
                            disabled={downloading === fee.payment_id}
                          >
                            {downloading === fee.payment_id ? 'Downloading…' : 'Receipt ⬇'}
                          </button>
                        </div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          {holds[a.application_ref_no] && new Date(holds[a.application_ref_no]) > new Date()
                            ? <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ojas-saffron-deep)', fontWeight: 600 }}>
                                Bank confirming payment.<br />Retry after {fmtTime(holds[a.application_ref_no])}
                              </span>
                            : <button
                                className="btn primary"
                                style={{ fontSize: 11, padding: '3px 8px' }}
                                onClick={() => handlePay(a.application_ref_no)}
                                disabled={paying === a.application_ref_no}
                              >
                                {paying === a.application_ref_no ? 'Opening…' : 'Pay Fee ▶'}
                              </button>
                          }
                          {/* A slip only exists once the bank has answered an attempt. */}
                          {fee && (fee.gateway_status_code || fee.gateway_response?.STC) && (
                            <button
                              className="btn"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => handleReceipt(fee.payment_id)}
                              disabled={downloading === fee.payment_id}
                              title={fee.status === 'pending' ? 'Pending payment slip' : 'Failed payment slip'}
                            >
                              {downloading === fee.payment_id ? 'Downloading…' : 'Slip ⬇'}
                            </button>
                          )}
                        </div>
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
