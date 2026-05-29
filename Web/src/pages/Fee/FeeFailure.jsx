import { useNavigate } from 'react-router-dom'

export default function FeeFailure() {
  const navigate = useNavigate()
  return (
    <>
      <div className="page-heading">
        <h1>Payment Failed</h1>
        <span className="guj">ચૂકવણી નિષ્ફળ</span>
      </div>
      <div className="notice warn" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
        <div className="title" style={{ color: 'var(--ojas-red)', fontSize: 18 }}>✗ Payment Not Completed</div>
        <p style={{ marginTop: 8 }}>Your payment was not completed. No amount has been deducted. If an amount was deducted from your account, it will be refunded within 5–7 working days.</p>
        <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 8 }}>For assistance, contact the Help Desk with your Registration ID and transaction reference.</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => navigate('/fee')}>Try Again</button>
          <button className="btn" onClick={() => navigate('/contact')}>Contact Help Desk</button>
        </div>
      </div>
    </>
  )
}
