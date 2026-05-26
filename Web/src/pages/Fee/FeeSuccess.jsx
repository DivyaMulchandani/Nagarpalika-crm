import { useNavigate } from 'react-router-dom'

export default function FeeSuccess() {
  const navigate = useNavigate()
  return (
    <>
      <div className="page-heading">
        <h1>Payment Successful</h1>
        <span className="guj">ચૂકવણી સફળ</span>
      </div>
      <div className="notice info" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
        <div className="title" style={{ color: '#2a7a2a', fontSize: 18 }}>✓ Payment Received</div>
        <p style={{ marginTop: 8 }}>Your fee payment has been recorded successfully. A confirmation will be sent to your registered email and mobile number.</p>
        <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 8 }}>Please allow up to 30 minutes for the status to update.</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => navigate('/fee')}>View Fee Status</button>
          <button className="btn" onClick={() => navigate('/careers')}>Back to Careers</button>
        </div>
      </div>
    </>
  )
}
