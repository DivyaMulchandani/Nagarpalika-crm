import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { get, post, BASE } from '../../api/index'
import { useAuth } from '../../context/AuthContext'
import { IconGear, IconWarn, IconCheck, IconCheckCircle } from '../../components/Icons'

const DEV = import.meta.env.DEV

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// ─────────────────────────────────────────────────────────────
// Inline OTP Login
// ─────────────────────────────────────────────────────────────
function OtpLogin({ onSuccess }) {
  const [step, setStep]       = useState('phone')   // 'phone' | 'otp'
  const [mobile, setMobile]   = useState('')
  const [otp, setOtp]         = useState('')
  const [devOtp, setDevOtp]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const sendOtp = async (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(mobile)) { setError('Enter valid 10-digit mobile number.'); return }
    setError(null); setLoading(true)
    try {
      const res = await post('/api/v1/otp/candidates/login/send', { mobile })
      if (DEV && res?.data?.dev_otp) { setDevOtp(res.data.dev_otp); setOtp(res.data.dev_otp) }
      setStep('otp')
      toast.info('OTP sent to your mobile number.')
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Try again.')
    } finally { setLoading(false) }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) { setError('Enter the OTP.'); return }
    setError(null); setLoading(true)
    try {
      await post('/api/v1/otp/candidates/login/verify', { mobile, otp: otp.trim() })
      toast.success('Login successful.')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally { setLoading(false) }
  }

  const reset = () => { setStep('phone'); setOtp(''); setDevOtp(null); setError(null) }

  return (
    <div className="box" style={{ maxWidth: 440, margin: '0 auto' }}>
      <div className="box-title">
        <span>{step === 'phone' ? 'Candidate Login' : 'Enter OTP'}</span>
        <span className="guj">{step === 'phone' ? 'ઉમેદવાર લૉગિન' : 'OTP દાખલ કરો'}</span>
      </div>
      <div className="box-body">
        {DEV && (
          <div className="notice warn" style={{ marginBottom: 12, fontSize: 12 }}>
            <strong><IconGear /> DEV MODE</strong> — OTP auto-filled from server.
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={sendOtp}>
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
                  autoFocus
                />
                <span style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>
                  Mobile number used during OTR registration
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
          <form onSubmit={verifyOtp}>
            <div className="form-row">
              <div style={{ fontSize: 13, color: 'var(--ojas-ink-2)', marginBottom: 12 }}>
                OTP sent to <strong>+91 {mobile}</strong>.{' '}
                <button type="button" className="btn-link" onClick={reset}>Change</button>
              </div>

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
                  <span style={{ fontSize: 11, color: '#b36b00' }}>
                    Dev OTP: <code>{devOtp}</code>
                  </span>
                )}
              </div>

              {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}

              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Login & Continue ▶'}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ojas-ink-3)' }}>
                Didn't receive OTP?{' '}
                <button type="button" className="btn-link" onClick={reset}>Resend</button>
              </div>
            </div>
          </form>
        )}

        <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--ojas-line)', paddingTop: 12 }}>
          Not registered?{' '}
          <Link to="/registration/apply/step/1" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Register Now (OTR) ▶</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Document Upload Panel — files selected here, submitted together with the application
// ─────────────────────────────────────────────────────────────
function DocumentUploadPanel({ advt, formData, onSuccess, onBack }) {
  const docs = [
    ...(advt.required_qualifications || []).map((rq) => ({
      label: rq.qualification?.name || String(rq.qualification),
      is_compulsory: rq.is_compulsory,
    })),
    ...(advt.caste_certificate?.required
      ? [{ label: 'Caste Certificate', is_compulsory: advt.caste_certificate.is_compulsory }]
      : []),
  ]

  const [files, setFiles]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)

  const compulsoryReady = docs.filter((d) => d.is_compulsory).every((d) => !!files[d.label])

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await post('/api/v1/applications', { advt_no: advt.advt_no, declaration_accepted: true, additional_fields: formData || {} })
      const ref = res?.data?.application_ref_no
      if (!ref) throw new Error('Could not get application reference number.')

      for (const { label, is_compulsory } of docs) {
        const file = files[label]
        if (!file) continue
        const fd = new FormData()
        fd.append('file', file)
        fd.append('label', label)
        fd.append('is_compulsory', String(is_compulsory))
        const uploadRes = await fetch(`${BASE}/api/v1/applications/${ref}/documents`, {
          method: 'POST', body: fd, credentials: 'include',
        })
        const uploadData = await uploadRes.json()
        if (!uploadData.isOk) toast.warn(`${label}: ${uploadData.message || 'Upload failed'}`)
      }

      toast.success('Application submitted successfully.')
      onSuccess(ref)
    } catch (err) {
      setError(err.message || 'Submission failed. Try again.')
      toast.error(err.message || 'Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="box-title">
        <span>Document Submission</span>
        <span className="guj">દસ્તાવેજ સબમિટ કરો</span>
      </div>
      <div className="box-body">
        <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>
          Select the required documents below. They will be uploaded when you submit your application.
          Accepted: PDF, JPG, PNG — max 5 MB each.
        </div>

        {docs.map(({ label, is_compulsory }) => (
          <div key={label} style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${files[label] ? '#c3e6cb' : is_compulsory ? '#f5c6cb' : 'var(--ojas-line)'}`, borderRadius: 4, background: files[label] ? '#f0fff4' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: is_compulsory ? '#f8d7da' : '#e2e8f0', color: is_compulsory ? '#721c24' : '#4a5568' }}>
                {is_compulsory ? 'Compulsory' : 'Optional'}
              </span>
            </div>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles((p) => ({ ...p, [label]: e.target.files[0] || undefined }))}
              style={{ fontSize: 13, width: '100%' }} />
            {files[label] && (
              <div style={{ color: '#2a7a2a', fontSize: 12, marginTop: 4 }}>✓ {files[label].name}</div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ color: 'var(--ojas-red)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 3 }}>
            <IconWarn /> {error}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 8 }}>
          <button className="btn" onClick={onBack} disabled={submitting}>← Back</button>
          {!compulsoryReady && (
            <span style={{ fontSize: 12, color: 'var(--ojas-red)', alignSelf: 'center' }}>
              <IconWarn /> Select all compulsory documents to submit.
            </span>
          )}
          <button className="btn primary" disabled={!compulsoryReady || submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit Application ▶'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Application Form (shown after login)
// ─────────────────────────────────────────────────────────────
function ApplicationFormPanel({ advt, onSuccess, onNext, onDeadline }) {
  const [agreed, setAgreed]   = useState(false)
  const [gender, setGender]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!advt?.end_date) return
    const deadline = new Date(advt.end_date)
    deadline.setHours(23, 59, 59, 999)
    const check = () => {
      if (Date.now() > deadline.getTime()) {
        toast.error('The application deadline has passed. This form is now closed.')
        onDeadline()
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [advt, onDeadline])

  const hasDocs = (advt.required_qualifications?.length > 0) || !!advt.caste_certificate?.required

  const handleNext = () => {
    if (!gender) { setError('Please select your gender.'); return }
    if (!agreed) { setError('Accept the declaration to continue.'); return }
    setError(null)
    onNext({ gender })
  }

  const handleSubmitDirect = async () => {
    if (!gender) { setError('Please select your gender.'); return }
    if (!agreed) { setError('Accept the declaration to continue.'); return }
    setError(null); setLoading(true)
    try {
      const res = await post('/api/v1/applications', { advt_no: advt.advt_no, declaration_accepted: true, additional_fields: { gender } })
      toast.success('Application submitted successfully.')
      onSuccess(res?.data?.application_ref_no)
    } catch (err) {
      setError(err.message || 'Submission failed. Try again.')
      toast.error(err.message || 'Submission failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="box-title">
        <span>Application Form — {advt.advt_no}</span>
        <span className="guj">ઓનલાઇન અરજી ફોર્મ</span>
      </div>
      <div className="box-body">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginBottom: 16 }}>
          <tbody>
            {[
              ['Post', advt.post_title?.en],
              advt.post_title?.gu ? ['Post (gu)', advt.post_title.gu] : null,
              ['Class', `Class ${advt.class}`],
              ['Department', advt.department?.departmentName],
              ['Total Posts', typeof advt.vacancies === 'object' ? advt.vacancies?.total : advt.vacancies],
              ['Pay Scale', advt.pay_scale],
              ['Application Fee', advt.application_fee ? `₹ ${advt.application_fee}` : 'Free'],
              ['Last Date to Apply', fmtDate(advt.end_date)],
            ].filter(Boolean).map(([label, value]) => value != null ? (
              <tr key={label}>
                <td style={{ width: '38%', color: 'var(--ojas-ink-3)', padding: '6px 12px', borderBottom: '1px solid var(--ojas-line)', fontWeight: 500, fontSize: 13 }}>{label}</td>
                <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--ojas-line)', fontFamily: label.includes('(gu)') ? 'var(--font-guj)' : 'inherit' }}>{value}</td>
              </tr>
            ) : null)}
          </tbody>
        </table>

        <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>
          Your personal details (name, DOB, category, address, photo, signature) are taken automatically from your <strong>OTR profile</strong>. Ensure your OTR profile is complete and accurate.
        </div>

        <div style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid var(--ojas-line)', borderRadius: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            Gender / જાતિ <span style={{ color: 'var(--ojas-red)' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Male', 'Female', 'Other'].map((g) => (
              <label key={g} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13.5 }}>
                <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} />
                {g}
              </label>
            ))}
          </div>
        </div>

        {hasDocs && (
          <div className="notice warn" style={{ fontSize: 13, marginBottom: 16 }}>
            <div className="title">Documents required after submission</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
              {(advt.required_qualifications || []).map((rq, i) => (
                <li key={i}>
                  {rq.qualification?.name || rq.qualification}
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: rq.is_compulsory ? 700 : 400, color: rq.is_compulsory ? '#721c24' : '#856404' }}>
                    ({rq.is_compulsory ? 'Compulsory' : 'Optional'})
                  </span>
                </li>
              ))}
              {advt.caste_certificate?.required && (
                <li>Caste Certificate
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: advt.caste_certificate.is_compulsory ? 700 : 400, color: advt.caste_certificate.is_compulsory ? '#721c24' : '#856404' }}>
                    ({advt.caste_certificate.is_compulsory ? 'Compulsory' : 'Optional'})
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="notice warn" style={{ fontSize: 13, marginBottom: 16 }}>
          <div className="title">Declaration / ઘોષણા</div>
          I hereby apply for the above post and declare that all information in my OTR profile is true and correct to the best of my knowledge. I understand that providing false information may result in cancellation of my application or appointment.
          <br />
          <span style={{ fontFamily: 'var(--font-guj)', fontSize: 11.5, marginTop: 8, display: 'block', color: 'var(--ojas-ink-2)' }}>
            હું ઘોષિત કરું છું કે મારી OTR પ્રોફાઇલની તમામ માહિતી સત્ય અને સાચી છે. ખોટી માહિતી આપવાથી અરજી રદ થઈ શકે છે.
          </span>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20, fontSize: 13.5 }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>I accept the above declaration and wish to submit my application for <strong>{advt.post_title?.en}</strong>.</span>
        </label>

        {error && (
          <div style={{ color: 'var(--ojas-red)', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 3 }}>
            <IconWarn /> {error}
          </div>
        )}

        <div className="form-actions">
          <Link to="/careers" className="btn">← Cancel</Link>
          {hasDocs ? (
            <button className="btn primary" disabled={!agreed} onClick={handleNext}>
              Next: Upload Documents →
            </button>
          ) : (
            <button className="btn primary" disabled={loading || !agreed} onClick={handleSubmitDirect}>
              {loading ? 'Submitting…' : 'Submit Application ▶'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Success Screen
// ─────────────────────────────────────────────────────────────
function SuccessPanel({ refNo, advt, navigate }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="notice info" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 42, marginBottom: 8, color: '#2a7a2a' }}><IconCheckCircle /></div>
        <div className="title" style={{ color: '#2a7a2a', fontSize: 20, marginBottom: 8 }}>Application Submitted</div>
        <div style={{ fontSize: 13.5, color: 'var(--ojas-ink-2)', marginBottom: 20 }}>
          Your application for <strong>{advt.post_title?.en}</strong> ({advt.advt_no}) has been received.
        </div>
        <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginBottom: 6 }}>Application Reference Number</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: 'var(--ojas-navy)', marginBottom: 20, padding: '10px 0', borderTop: '1px solid var(--ojas-line)', borderBottom: '1px solid var(--ojas-line)' }}>
          {refNo}
        </div>
        <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginBottom: 24 }}>
          Note this reference number. You will need it to print your application form and track status.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => navigate('/application/print', { state: { ref: refNo } })}>
            Print Application ▶
          </button>
          <button className="btn" onClick={() => navigate('/fee')}>
            Pay Fee ▶
          </button>
          <Link to="/careers" className="btn">Browse More Openings</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Already Applied Panel
// ─────────────────────────────────────────────────────────────
function AlreadyAppliedPanel({ advt, myApp, navigate }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="notice info">
        <div className="title" style={{ color: '#2a7a2a' }}>Already Applied <IconCheck /></div>
        <p style={{ marginTop: 8, fontSize: 13.5 }}>
          You have already submitted an application for <strong>{advt.post_title?.en}</strong> ({advt.advt_no}).
        </p>
        {myApp?.application_ref_no && (
          <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fff', border: '1px solid var(--ojas-line)', borderRadius: 3 }}>
            <span style={{ fontSize: 12, color: 'var(--ojas-ink-3)' }}>Reference No: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--ojas-navy)' }}>{myApp.application_ref_no}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {myApp?.application_ref_no && (
            <button className="btn primary" onClick={() => navigate('/application/print', { state: { ref: myApp.application_ref_no } })}>
              Print Application ▶
            </button>
          )}
          <Link to="/careers" className="btn">← Back to Openings</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function ApplyDirect() {
  const { slug }  = useParams()
  const id        = slug
  const navigate  = useNavigate()
  const { refresh } = useAuth()

  // screen: 'loading' | 'not_found' | 'closed' | 'error' | 'login' | 'form' | 'already_applied' | 'success'
  const [screen, setScreen]   = useState('loading')
  const [advt, setAdvt]       = useState(null)
  const [myApp, setMyApp]     = useState(null)
  const [refNo, setRefNo]     = useState(null)
  const [formData, setFormData] = useState({})

  const loadData = useCallback(() => {
    setScreen('loading')
    Promise.all([
      get(`/api/v1/advertisements/${id}`),
      get('/api/v1/applications/me', undefined, { silent401: true }).catch(() => null),
    ]).then(([advtRes, authRes]) => {
      const a = advtRes?.data
      if (!a) { setScreen('not_found'); return }
      if (a.status === 'Closed' || a.status === 'Archived') { setAdvt(a); setScreen('closed'); return }
      if (a.status !== 'Published') { setAdvt(a); setScreen('closed'); return }

      setAdvt(a)

      if (authRes === null) {
        // 401 — not logged in
        setScreen('login')
        return
      }

      // Check if already applied
      const existing = (authRes?.data || []).find(ap => ap.advt_no === a.advt_no)
      if (existing) { setMyApp(existing); setScreen('already_applied'); return }

      setScreen('form')
    }).catch(() => setScreen('error'))
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // After OTP login succeeds, hydrate the auth context (header state)
  // and re-check existing applications
  const handleLoginSuccess = () => { refresh(); loadData() }

  const handleSubmitSuccess = (ref) => {
    setRefNo(ref)
    setScreen('success')
  }

  // ── Screens ─────────────────────────────────────────────────

  if (screen === 'loading') {
    return <div style={{ padding: 56, textAlign: 'center', color: 'var(--ojas-ink-3)', fontSize: 15 }}>Loading…</div>
  }

  if (screen === 'not_found') {
    return (
      <>
        <div className="page-heading"><h1>Advertisement Not Found</h1></div>
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Not Found</div>
          This advertisement does not exist or is no longer available.{' '}
          <Link to="/careers" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Browse Current Openings →</Link>
        </div>
      </>
    )
  }

  if (screen === 'error') {
    return (
      <>
        <div className="page-heading"><h1>Error</h1></div>
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Something went wrong</div>
          Could not load the advertisement. Please try again.{' '}
          <button className="btn-link" onClick={loadData}>Retry</button>
        </div>
      </>
    )
  }

  const heading = (
    <>
      <div className="page-heading">
        <h1>Apply Online</h1>
        <span className="guj">ઓનલાઇન અરજી</span>
      </div>

      {/* advt summary strip */}
      {advt && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ background: 'var(--ojas-navy)', color: '#fff', padding: '4px 12px', borderRadius: 3, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {advt.advt_no}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ojas-ink-1)' }}>
            {advt.post_title?.en}
          </span>
          {advt.post_title?.gu && (
            <span style={{ fontFamily: 'var(--font-guj)', fontSize: 13, color: 'var(--ojas-ink-3)' }}>
              ({advt.post_title.gu})
            </span>
          )}
        </div>
      )}
    </>
  )

  if (screen === 'closed') {
    return (
      <>
        {heading}
        <div className="notice warn" style={{ maxWidth: 480, margin: '24px auto' }}>
          <div className="title">Applications Closed</div>
          This advertisement is no longer accepting applications.{' '}
          <Link to="/careers" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Browse Current Openings →</Link>
        </div>
      </>
    )
  }

  if (screen === 'upload_docs') {
    return (
      <>
        {heading}
        <DocumentUploadPanel
          advt={advt}
          formData={formData}
          onSuccess={(ref) => { setRefNo(ref); setScreen('success') }}
          onBack={() => setScreen('form')}
        />
      </>
    )
  }

  if (screen === 'success') {
    return (
      <>
        {heading}
        <SuccessPanel refNo={refNo} advt={advt} navigate={navigate} />
      </>
    )
  }

  if (screen === 'already_applied') {
    return (
      <>
        {heading}
        <AlreadyAppliedPanel advt={advt} myApp={myApp} navigate={navigate} />
      </>
    )
  }

  return (
    <>
      {heading}

      {screen === 'login' && (
        <>
          <div className="notice info" style={{ maxWidth: 440, margin: '0 auto 16px', fontSize: 13 }}>
            <div className="title">Login Required</div>
            Login with your registered mobile number to apply for this post.
          </div>
          <OtpLogin onSuccess={handleLoginSuccess} />
        </>
      )}

      {screen === 'form' && (
        <ApplicationFormPanel
          advt={advt}
          onSuccess={handleSubmitSuccess}
          onNext={(data) => { setFormData(data); setScreen('upload_docs') }}
          onDeadline={() => setScreen('closed')}
        />
      )}
    </>
  )
}
