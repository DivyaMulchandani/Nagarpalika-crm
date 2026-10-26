import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { IconCheckCircle } from '../../components/Icons'
import { get } from '../../api/index'
import { downloadFeeReceipt } from '../../api/easypay'

export default function FeeSuccess() {
  const navigate = useNavigate()
  // The server redirects here with ?ref=<application_ref_no> only after it has
  // recorded the payment, so the paid row already exists.
  const [params] = useSearchParams()
  const ref = params.get('ref')

  const [paymentId, setPaymentId] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!ref) return
    get('/api/v1/fee-payments/me', undefined, { silent401: true })
      .then((res) => {
        const paid = (res?.data ?? []).find(
          (f) => f.application_ref_no === ref && f.status === 'paid',
        )
        if (paid) setPaymentId(paid.payment_id)
      })
      .catch(() => {})
  }, [ref])

  const handleReceipt = async () => {
    setDownloading(true)
    try {
      await downloadFeeReceipt(paymentId)
    } catch (err) {
      toast.error(err.message || 'Could not download the receipt.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Payment Successful</h1>
        <span className="guj">ચૂકવણી સફળ</span>
      </div>
      <div className="notice info" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
        <div className="title" style={{ color: '#2a7a2a', fontSize: 18 }}><IconCheckCircle /> Payment Received</div>
        <p style={{ marginTop: 8 }}>Your fee payment has been recorded successfully. A confirmation will be sent to your registered email and mobile number.</p>
        {ref && (
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Application: <span style={{ fontFamily: 'var(--font-mono)' }}>{ref}</span>
          </p>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {paymentId && (
            <button className="btn primary" onClick={handleReceipt} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download Receipt ⬇'}
            </button>
          )}
          <button className={paymentId ? 'btn' : 'btn primary'} onClick={() => navigate('/applications')}>View My Applications</button>
          <button className="btn" onClick={() => navigate('/careers')}>Back to Careers</button>
        </div>
        {!paymentId && (
          <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 10 }}>
            Your receipt can also be downloaded any time from My Applications.
          </p>
        )}
      </div>
    </>
  )
}
