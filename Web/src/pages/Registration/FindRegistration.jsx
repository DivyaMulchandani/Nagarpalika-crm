import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../../api/index'
import { useAuth } from '../../context/AuthContext'

const DEV = import.meta.env.DEV

// Only allow internal redirect targets — never off-site URLs
const safeRedirect = (raw) =>
  raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/application'

export default function FindRegistration() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const [step, setStep]                   = useState('phone')   // 'phone' | 'otp'
  const [identifier, setIdentifier]       = useState('')
  const [otp, setOtp]                     = useState('')
  const [deliveryChannel, setDeliveryChannel] = useState(null)
  const [devOtp, setDevOtp]               = useState(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const val = identifier.trim()
    if (!val) { setError('Enter your Mobile Number, Email, or OTR Registration ID.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await post('/api/v1/otp/candidates/login/send', { identifier: val })
      if (res?.data?.channel) setDeliveryChannel(res.data.channel)
      setStep('otp')
      toast.info(res?.message || 'OTP sent to your registered contact details.')
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Try again.')
      toast.error(err.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) { setError('Enter the OTP.'); return }
    setError(null)
    setLoading(true)
    try {
      await post('/api/v1/otp/candidates/login/verify', { identifier: identifier.trim(), otp: otp.trim() })
      await refresh() // hydrate auth context so header/protected routes update
      toast.success('Login successful.')
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link to="/" className="btn-back">← Back to Home</Link>

      <div className="page-heading">
        <h1>Candidate Login</h1>
        <span className="guj">ઉમેદવાર લૉગિન</span>
      </div>

      <div style={{ maxWidth: 460, margin: '0 auto' }}>

        <div className="box">
          <div className="box-title">
            <span>{step === 'phone' ? 'Candidate Login' : 'Verify OTP'}</span>
          </div>
          <div className="box-body">

            {step === 'phone' && (
              <form onSubmit={handleSendOtp}>
                <div className="form-row">
                  <div className="form-field">
                    <label>Mobile Number / Email / Registration ID *</label>
                    <input
                      type="text"
                      placeholder="Mobile, Email, or OTR Reg ID"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                    />
                    <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>
                      Enter your 10-digit mobile number, registered email, or OTR Registration ID
                    </span>
                  </div>
                  {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
                  <div className="form-actions">
                    <button type="submit" className="btn primary" disabled={loading || !identifier.trim()}>
                      {loading ? 'Sending…' : 'Send OTP ▶'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-row">
                  <div style={{ fontSize: 13, color: 'var(--ojas-ink-2)', marginBottom: 12 }}>
                    OTP sent for <strong>{identifier}</strong>
                    {deliveryChannel ? ` via ${deliveryChannel.toUpperCase()}` : ''}.{' '}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--ojas-saffron-deep)', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0 }}
                      onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); setError(null) }}
                    >
                      Change
                    </button>
                  </div>

                  <div className="form-field">
                    <label>Enter 6-digit OTP *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="______"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
                      autoFocus
                    />
                    {DEV && devOtp && (
                      <span style={{ fontSize: 11, color: '#b36b00' }}>
                        Dev OTP auto-filled: <code>{devOtp}</code>
                      </span>
                    )}
                  </div>

                  {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}

                  <div className="form-actions">
                    <button type="submit" className="btn primary" disabled={loading || otp.length !== 6}>
                      {loading ? 'Verifying…' : 'Verify & Login ▶'}
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ojas-ink-3)' }}>
                    Didn't receive OTP?{' '}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--ojas-saffron-deep)', cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: 0 }}
                      onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); setError(null) }}
                    >
                      Resend
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--ojas-line)', paddingTop: 12 }}>
              Not registered yet?{' '}
              <Link to="/registration/apply/step/1" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Register Now (OTR) ▶</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
