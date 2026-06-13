import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../../api/index'
import { useAuth } from '../../context/AuthContext'
import { IconGear } from '../../components/Icons'

const DEV = import.meta.env.DEV

// Only allow internal redirect targets — never off-site URLs
const safeRedirect = (raw) =>
  raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/application'

export default function FindRegistration() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const [step, setStep]       = useState('phone')   // 'phone' | 'otp'
  const [mobile, setMobile]   = useState('')
  const [otp, setOtp]         = useState('')
  const [devOtp, setDevOtp]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(mobile.trim())) { setError('Enter valid 10-digit mobile number.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await post('/api/v1/otp/candidates/login/send', { mobile: mobile.trim() })
      if (DEV && res?.data?.dev_otp) {
        setDevOtp(res.data.dev_otp)
        setOtp(res.data.dev_otp)
      }
      setStep('otp')
      toast.info('OTP sent to your mobile number.')
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
      await post('/api/v1/otp/candidates/login/verify', { mobile: mobile.trim(), otp: otp.trim() })
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
        {DEV && (
          <div className="notice warn" style={{ marginBottom: 12, fontSize: 12 }}>
            <strong><IconGear /> DEV MODE</strong> — OTP bypass active. Use <code>000000</code> or OTP is auto-filled from server response.
          </div>
        )}

        <div className="box">
          <div className="box-title">
            <span>{step === 'phone' ? 'Enter Mobile Number' : 'Verify OTP'}</span>
          </div>
          <div className="box-body">

            {step === 'phone' && (
              <form onSubmit={handleSendOtp}>
                <div className="form-row">
                  <div className="form-field">
                    <label>Registered Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      autoComplete="tel"
                      maxLength={10}
                    />
                    <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>
                      Use the mobile number registered during OTR
                    </span>
                  </div>
                  {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
                  <div className="form-actions">
                    <button type="submit" className="btn primary" disabled={loading || mobile.length !== 10}>
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
                    OTP sent to <strong>+91 {mobile}</strong>.{' '}
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
