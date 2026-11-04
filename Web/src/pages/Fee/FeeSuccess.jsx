import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { IconCheckCircle } from '../../components/Icons'
import { get } from '../../api/index'
import { downloadFeeReceipt } from '../../api/easypay'

export default function FeeSuccess() {
  const navigate = useNavigate()
  // Anyone can open this URL with any ?ref=, so "Payment Received" is only shown
  // once the candidate's own payment record says so. A session that expired
  // during payment lands on the neutral message and can check after logging in.
  const [params] = useSearchParams()
  const ref = params.get('ref')

  const [paymentId, setPaymentId] = useState(null)
  const [checking, setChecking] = useState(Boolean(ref))
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
      .finally(() => setChecking(false))
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

  if (checking) {
    return (
      <div className="notice info" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
        Checking your payment…
      </div>
    )
  }

  if (!paymentId) {
    return (
      <>
        <div className="page-heading">
          <h1>Payment Status</h1>
          <span className="guj">ચૂકવણીની સ્થિતિ</span>
        </div>
        <div className="notice info" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
          <p>We could not show your payment here. Please open My Applications to see its status — you may need to log in again. Please do NOT pay again until you have checked.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => navigate('/applications')}>View My Applications</button>
            <button className="btn" onClick={() => navigate('/contact')}>Contact Help Desk</button>
          </div>
        </div>
      </>
    )
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
        <p style={{ fontSize: 13, marginTop: 8 }}>
          Application: <span style={{ fontFamily: 'var(--font-mono)' }}>{ref}</span>
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={handleReceipt} disabled={downloading}>
            {downloading ? 'Downloading…' : 'Download Receipt ⬇'}
          </button>
          <button className="btn" onClick={() => navigate('/applications')}>View My Applications</button>
          <button className="btn" onClick={() => navigate('/careers')}>Back to Careers</button>
        </div>
      </div>
    </>
  )
}
