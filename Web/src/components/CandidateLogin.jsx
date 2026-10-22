import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../api/index'

const DEV = import.meta.env.DEV

// Same rule the OTR registration form and the server enforce, so a password
// set here can always be used there and vice versa.
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\\|;'`~]).{8,}$/
const PASSWORD_HINT = 'At least 8 characters with one uppercase letter, one digit and one special character.'

const linkBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--ojas-saffron-deep)',
  cursor: 'pointer',
  fontWeight: 700,
  padding: 0,
}

/**
 * The single candidate login widget.
 *
 * Used both on the standalone login page and inline on the apply page. It
 * lived in two places before, which is why one of them kept OTP-only login
 * after the other gained passwords — one copy is the point of this component.
 *
 * Password login matches on registration_id specifically (that is what the
 * server looks up); the OTP path additionally accepts mobile or email.
 *
 * @param {function} onSuccess   called after a successful login
 * @param {string}   submitLabel text of the password/OTP submit button
 */
export default function CandidateLogin({ onSuccess, submitLabel = 'Login' }) {
  // password | otp-request | otp-verify | forgot-request | forgot-verify | forgot-reset
  const [step, setStep] = useState('password')

  const [regId, setRegId] = useState('')
  const [password, setPassword] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [deliveryChannel, setDeliveryChannel] = useState(null)
  const [devOtp, setDevOtp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const goTo = (next) => { setStep(next); setError(null); setOtp('') }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    const id = regId.trim()
    if (!id || !password) { setError('Enter your Registration ID and password.'); return }
    setError(null); setLoading(true)
    try {
      await post('/api/v1/candidates/auth/login', { registration_id: id, password })
      toast.success('Login successful.')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Invalid Registration ID or password.')
      toast.error(err.message || 'Invalid Registration ID or password.')
    } finally { setLoading(false) }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const val = identifier.trim()
    if (!val) { setError('Enter your Mobile Number, Email, or OTR Registration ID.'); return }

    const isMobile = /^[6-9]\d{9}$/.test(val)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    const isRegId = /^[A-Za-z0-9\-_]{5,30}$/.test(val)
    if (!isMobile && !isEmail && !isRegId) {
      setError('Please enter a valid 10-digit mobile number, email address, or OTR Registration ID.')
      return
    }

    setError(null); setLoading(true)
    try {
      const res = await post('/api/v1/otp/candidates/login/send', { identifier: val })
      if (res?.data?.channel) setDeliveryChannel(res.data.channel)
      setStep('otp-verify')
      toast.info(res?.message || 'OTP sent to your registered contact details.')
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Try again.')
      toast.error(err.message || 'Failed to send OTP. Try again.')
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return }
    setError(null); setLoading(true)
    try {
      await post('/api/v1/otp/candidates/login/verify', { identifier: identifier.trim(), otp: otp.trim() })
      toast.success('Login successful.')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally { setLoading(false) }
  }

  const handleForgotSend = async (e) => {
    e.preventDefault()
    const id = regId.trim()
    if (!id) { setError('Enter your Registration ID.'); return }
    setError(null); setLoading(true)
    try {
      const res = await post('/api/v1/otp/candidates/password-reset/send', { registration_id: id })
      if (res?.data?.channel) setDeliveryChannel(res.data.channel)
      setStep('forgot-verify')
      // The server answers identically whether or not the id exists, so this
      // wording must not imply the account was found.
      toast.info(res?.message || 'If this Registration ID exists, an OTP has been sent.')
    } catch (err) {
      setError(err.message || 'Could not send OTP. Try again.')
      toast.error(err.message || 'Could not send OTP. Try again.')
    } finally { setLoading(false) }
  }

  const handleForgotVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return }
    setError(null); setLoading(true)
    try {
      await post('/api/v1/otp/candidates/password-reset/verify', {
        registration_id: regId.trim(),
        otp: otp.trim(),
      })
      goTo('forgot-reset')
      toast.success('OTP verified. Choose a new password.')
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!PASSWORD_RE.test(newPassword)) { setError(PASSWORD_HINT); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setError(null); setLoading(true)
    try {
      await post('/api/v1/candidates/auth/password/reset', {
        registration_id: regId.trim(),
        otp_token: 'verified', // the real proof is the server-side session flag
        new_password: newPassword,
      })
      setPassword(''); setNewPassword(''); setConfirmPassword('')
      goTo('password')
      toast.success('Password reset. Please log in with your new password.')
    } catch (err) {
      setError(err.message || 'Could not reset password. Try again.')
      toast.error(err.message || 'Could not reset password. Try again.')
    } finally { setLoading(false) }
  }

  const titles = {
    'password':       ['Candidate Login', 'ઉમેદવાર લૉગિન'],
    'otp-request':    ['Login with OTP', 'ઓટીપી સાથે લૉગિન'],
    'otp-verify':     ['Enter OTP', 'OTP દાખલ કરો'],
    'forgot-request': ['Forgot Password', 'પાસવર્ડ ભૂલી ગયા'],
    'forgot-verify':  ['Enter OTP', 'OTP દાખલ કરો'],
    'forgot-reset':   ['Set New Password', 'નવો પાસવર્ડ સેટ કરો'],
  }
  const [title, titleGu] = titles[step]

  const errorLine = error && (
    <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>
  )

  const otpInput = (
    <div className="form-field">
      <label>6-digit OTP *</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="● ● ● ● ● ●"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
        autoFocus
      />
      {DEV && devOtp && (
        <span style={{ fontSize: 11, color: '#b36b00' }}>Dev OTP: <code>{devOtp}</code></span>
      )}
    </div>
  )

  return (
    <div className="box" style={{ maxWidth: 440, margin: '0 auto' }}>
      <div className="box-title">
        <span>{title}</span>
        <span className="guj">{titleGu}</span>
      </div>
      <div className="box-body">

        {step === 'password' && (
          <form onSubmit={handlePasswordLogin}>
            <div className="form-row">
              <div className="form-field">
                <label>Registration ID (OTR) *</label>
                <input
                  type="text"
                  placeholder="e.g. OTR2026001234"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 30))}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Password *</label>
                <input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || !regId.trim() || !password}>
                  {loading ? 'Signing in…' : `${submitLabel} ▶`}
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" style={{ ...linkBtn, fontSize: 12.5 }} onClick={() => goTo('forgot-request')}>
                  Forgot password?
                </button>
                <button type="button" style={{ ...linkBtn, fontSize: 12.5 }} onClick={() => goTo('otp-request')}>
                  Login with OTP instead ▶
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'otp-request' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-row">
              <div className="form-field">
                <label>Login Identifier *</label>
                <input
                  type="text"
                  placeholder="Mobile / Email / OTR Number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/[^A-Za-z0-9@._\-]/g, '').slice(0, 100))}
                  autoComplete="username"
                  autoFocus
                />
                <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>
                  Enter Mobile Number, Email Address, or OTR Registration ID
                </span>
              </div>
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || !identifier.trim()}>
                  {loading ? 'Sending…' : 'Send OTP ▶'}
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5 }}>
                <button type="button" style={{ ...linkBtn, fontSize: 12.5 }} onClick={() => goTo('password')}>
                  ◀ Login with password instead
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'otp-verify' && (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-row">
              <div style={{ fontSize: 13, color: 'var(--ojas-ink-2)', marginBottom: 12 }}>
                OTP sent for <strong>{identifier}</strong>
                {deliveryChannel ? ` via ${deliveryChannel.toUpperCase()}` : ''}.{' '}
                <button type="button" style={{ ...linkBtn, fontSize: 13 }} onClick={() => goTo('otp-request')}>
                  Change
                </button>
              </div>
              {otpInput}
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : `${submitLabel} ▶`}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ojas-ink-3)' }}>
                Didn't receive OTP?{' '}
                <button type="button" style={{ ...linkBtn, fontSize: 12 }} onClick={() => goTo('otp-request')}>
                  Resend
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'forgot-request' && (
          <form onSubmit={handleForgotSend}>
            <div className="form-row">
              <div style={{ fontSize: 12.5, color: 'var(--ojas-ink-2)', marginBottom: 10 }}>
                We will send a one-time password to the mobile number and email
                registered against your OTR.
              </div>
              <div className="form-field">
                <label>Registration ID (OTR) *</label>
                <input
                  type="text"
                  placeholder="e.g. OTR2026001234"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 30))}
                  autoFocus
                />
              </div>
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || !regId.trim()}>
                  {loading ? 'Sending…' : 'Send OTP ▶'}
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5 }}>
                <button type="button" style={{ ...linkBtn, fontSize: 12.5 }} onClick={() => goTo('password')}>
                  ◀ Back to login
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'forgot-verify' && (
          <form onSubmit={handleForgotVerify}>
            <div className="form-row">
              <div style={{ fontSize: 13, color: 'var(--ojas-ink-2)', marginBottom: 12 }}>
                OTP sent for <strong>{regId}</strong>
                {deliveryChannel ? ` via ${deliveryChannel.toUpperCase()}` : ''}.
              </div>
              {otpInput}
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Verify OTP ▶'}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ojas-ink-3)' }}>
                Didn't receive OTP?{' '}
                <button type="button" style={{ ...linkBtn, fontSize: 12 }} onClick={() => goTo('forgot-request')}>
                  Resend
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'forgot-reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-row">
              <div className="form-field">
                <label>New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
                <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>{PASSWORD_HINT}</span>
              </div>
              <div className="form-field">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {errorLine}
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || !newPassword || !confirmPassword}>
                  {loading ? 'Saving…' : 'Reset Password ▶'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--ojas-line)', paddingTop: 12 }}>
          Not registered?{' '}
          <Link to="/registration" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Register Now (OTR) ▶</Link>
        </div>
      </div>
    </div>
  )
}
