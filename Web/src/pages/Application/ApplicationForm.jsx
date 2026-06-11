import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../../api/index'
import { IconCheckCircle } from '../../components/Icons'

export default function ApplicationForm() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const advt      = state?.advt

  const [agreed, setAgreed]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [refNo, setRefNo]     = useState(null)

  // Hard deadline: the form auto-exits the moment the advertisement's last
  // day ends (midnight). The API enforces the same cut-off server-side.
  useEffect(() => {
    if (!advt?.end_date || refNo) return
    const deadline = new Date(advt.end_date)
    deadline.setHours(23, 59, 59, 999)
    const check = () => {
      if (Date.now() > deadline.getTime()) {
        toast.error('The application deadline has passed. This form is now closed.')
        navigate('/careers', { replace: true })
      }
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [advt, refNo, navigate])

  if (!advt) {
    navigate('/application', { replace: true })
    return null
  }

  const handleSubmit = async () => {
    if (!agreed) { setError('You must accept the declaration before submitting.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await post('/api/v1/applications', { advt_no: advt.advt_no, declaration_accepted: true })
      toast.success('Application submitted successfully.')
      setRefNo(res?.data?.application_ref_no)
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
      toast.error(err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (refNo) {
    return (
      <>
        <div className="page-heading"><h1>Application Submitted</h1></div>
        <div className="notice info" style={{ maxWidth: 520, margin: '32px auto', textAlign: 'center' }}>
          <div className="title" style={{ color: '#2a7a2a', fontSize: 18 }}><IconCheckCircle /> Application Received</div>
          <p style={{ marginTop: 8 }}>Your Application Reference Number is:</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: '12px 0' }}>{refNo}</p>
          <p style={{ fontSize: 12, color: 'var(--ojas-ink-3)' }}>Note this number. You will need it to track your application and print the form.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => navigate('/application/print', { state: { ref: refNo } })}>Print Application ▶</button>
            <button className="btn" onClick={() => navigate('/fee')}>Pay Fee ▶</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-heading">
        <h1>Online Application</h1>
        <span className="guj">ઓનલાઇન અરજી ફોર્મ</span>
      </div>

      <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="box-title"><span>Advertisement: {advt.advt_no}</span></div>
        <div className="box-body">
          <table className="ojas kv" style={{ marginBottom: 16 }}>
            <tbody>
              <tr><td style={{ width: 160, color: 'var(--ojas-ink-3)' }}>Post</td><td>{advt.post_title?.en}</td></tr>
              {advt.post_title?.gu && <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Post (Gujarati)</td><td style={{ fontFamily: 'var(--font-guj)' }}>{advt.post_title.gu}</td></tr>}
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Class</td><td>{advt.class}</td></tr>
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Total Posts</td><td>{(typeof advt.vacancies === 'object' ? advt.vacancies?.total : advt.vacancies) ?? '—'}</td></tr>
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Application Fee</td><td>{advt.application_fee ? `₹${advt.application_fee}` : 'No fee'}</td></tr>
              {advt.pay_scale && <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Pay Scale</td><td>{advt.pay_scale}</td></tr>}
              <tr><td style={{ color: 'var(--ojas-ink-3)' }}>Last Date</td><td>{advt.end_date ? new Date(advt.end_date).toLocaleDateString('en-IN') : '—'}</td></tr>
            </tbody>
          </table>

          <div className="notice info" style={{ fontSize: 13, marginBottom: 16 }}>
            Your personal details (name, DOB, category, address, photo, signature) will be taken from your OTR profile. Ensure your OTR profile is complete and up to date before applying.
          </div>

          <div className="notice warn" style={{ fontSize: 13, marginBottom: 16 }}>
            <div className="title">Declaration / ઘોષણા</div>
            I hereby apply for the above post and declare that all information in my OTR profile is true and correct to the best of my knowledge. I understand that providing false information may result in cancellation of my application or appointment.
            <br /><span style={{ fontFamily: 'var(--font-guj)', fontSize: 11, marginTop: 6, display: 'block' }}>હું ઘોષિત કરું છું કે મારી OTR પ્રોફાઇલની તમામ માહિતી સત્ય અને સાચી છે.</span>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span style={{ fontSize: 13 }}>I accept the declaration and wish to submit my application.</span>
          </label>

          {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div className="form-actions">
            <button className="btn" onClick={() => navigate('/application')}>← Cancel</button>
            <button className="btn primary" disabled={loading || !agreed} onClick={handleSubmit}>
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
