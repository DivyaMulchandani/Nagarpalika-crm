import { useNavigate, useSearchParams } from 'react-router-dom'

// An amount mismatch is NOT a plain decline: the checksum was valid, so the
// bank really did process something — just not the figure we asked for. Telling
// that candidate "no amount has been deducted" would be a false statement about
// their money, so it gets its own wording and no retry button.
const REASONS = {
  amount_mismatch: {
    heading: 'Payment Under Verification',
    guj: 'ચૂકવણી ચકાસણી હેઠળ',
    title: 'Payment Needs Verification',
    body: 'The bank reported an amount different from the fee due for this application, so your payment could not be confirmed automatically. It has been flagged for manual verification — please do NOT pay again.',
    bodyGuj: 'બેંકે અપેક્ષિત રકમથી અલગ રકમ જણાવી છે, તેથી તમારી ચુકવણી આપમેળે ખાતરી કરી શકાઈ નથી. કૃપા કરીને ફરીથી ચુકવણી કરશો નહીં.',
    retry: false,
  },
  server_error: {
    title: 'Payment Result Could Not Be Processed',
    body: 'The bank\'s response reached us but could not be processed. If an amount was deducted, do NOT pay again — contact the Help Desk and it will be verified against the bank.',
    retry: false,
  },
}

const DEFAULT = {
  heading: 'Payment Failed',
  guj: 'ચૂકવણી નિષ્ફળ',
  title: '✗ Payment Not Completed',
  body: 'Your payment was not completed. No amount has been deducted. If an amount was deducted from your account, it will be refunded within 5–7 working days.',
  retry: true,
}

export default function FeeFailure() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const r = { ...DEFAULT, ...(REASONS[params.get('reason')] || {}) }
  const ref = params.get('ref')

  return (
    <>
      <div className="page-heading">
        <h1>{r.heading}</h1>
        <span className="guj">{r.guj}</span>
      </div>
      <div className="notice warn" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
        <div className="title" style={{ color: 'var(--ojas-red)', fontSize: 18 }}>{r.title}</div>
        <p style={{ marginTop: 8 }}>{r.body}</p>
        {r.bodyGuj && (
          <p style={{ fontSize: 12.5, color: 'var(--ojas-ink-3)', marginTop: 8, fontFamily: 'var(--font-guj)', lineHeight: 1.7 }}>{r.bodyGuj}</p>
        )}
        {ref && (
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Application: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ref}</span>
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginTop: 8 }}>For assistance, contact the Help Desk with your Registration ID and transaction reference.</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
          {r.retry && <button className="btn primary" onClick={() => navigate('/applications')}>Try Again</button>}
          <button className={r.retry ? 'btn' : 'btn primary'} onClick={() => navigate('/contact')}>Contact Help Desk</button>
        </div>
      </div>
    </>
  )
}
