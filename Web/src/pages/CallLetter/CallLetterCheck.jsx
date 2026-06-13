import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { post } from '../../api/index'

const REG_ID_RE = /^[A-Z0-9/-]{4,30}$/
const TODAY = new Date().toISOString().slice(0, 10)
const MIN_DOB = '1947-01-01'

export default function CallLetterCheck() {
  const navigate = useNavigate()
  const [regId, setRegId]     = useState('')
  const [dob, setDob]         = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  // Keyboard restriction: uppercase letters, digits, / and - only
  const handleRegIdChange = (e) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 30)
    setRegId(cleaned)
    if (errors.regId) setErrors((p) => ({ ...p, regId: null }))
  }

  const validate = () => {
    const errs = {}
    if (!REG_ID_RE.test(regId.trim()))
      errs.regId = 'Enter a valid Registration ID (letters, digits, / and - only).'
    if (!dob)
      errs.dob = 'Date of Birth is required.'
    else if (dob > TODAY || dob < MIN_DOB)
      errs.dob = 'Enter a valid Date of Birth.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.warn('Please correct the highlighted fields.')
      return
    }
    setLoading(true)
    try {
      const res = await post('/api/v1/call-letters/list', { registration_id: regId.trim(), dob })
      const results = res.data || []
      if (results.length === 0) toast.info('No call letters found for this registration yet.')
      navigate('/callletter/result', { state: { results, regId: regId.trim(), dob } })
    } catch (err) {
      toast.error(err.message || 'No call letters found for this registration.')
      setErrors({ _: err.message || 'No call letters found for this registration.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link to="/" className="btn-back">← Back to Home</Link>

      <div className="page-heading">
        <h1>Call Letter / Hall Ticket Download</h1>
        <span className="guj">પરીક્ષા હોલ ટિકિટ ડાઉનલોડ</span>
      </div>

      <div className="notice warn">
        <div className="title">IMPORTANT · મહત્વપૂર્ણ</div>
        Candidates are <strong>STRICTLY</strong> advised to bring the printed Call Letter and a valid photo identity proof to the examination centre.{' '}
        <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-guj)' }}>કોલ લેટર વગર પ્રવેશ આપવામાં આવશે નહીં.</span>
      </div>

      <div className="two-col">
        <div>
          <div className="box">
            <div className="box-title">
              <span>Download Your Call Letter</span>
              <span className="guj">તમારો કોલ લેટર ડાઉનલોડ કરો</span>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="form-field">
                    <label>Registration ID (OTR ID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. OTR2026001234"
                      value={regId}
                      onChange={handleRegIdChange}
                      maxLength={30}
                      autoComplete="off"
                      aria-invalid={!!errors.regId}
                    />
                    {errors.regId && <span style={{ color: 'var(--ojas-red)', fontSize: 12 }}>{errors.regId}</span>}
                  </div>
                  <div className="form-field">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      value={dob}
                      min={MIN_DOB}
                      max={TODAY}
                      onChange={(e) => { setDob(e.target.value); if (errors.dob) setErrors((p) => ({ ...p, dob: null })) }}
                      aria-invalid={!!errors.dob}
                    />
                    {errors.dob && <span style={{ color: 'var(--ojas-red)', fontSize: 12 }}>{errors.dob}</span>}
                  </div>
                  {errors._ && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{errors._}</p>}
                  <div className="form-actions">
                    <button type="submit" className="btn primary" disabled={loading}>
                      {loading ? 'Checking…' : 'Find Call Letters'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div>
          <div className="notice info">
            <div className="title">HOW TO DOWNLOAD</div>
            <ol style={{ paddingLeft: 20, marginTop: 8, fontSize: 13 }}>
              <li>Enter your OTR Registration ID and Date of Birth.</li>
              <li>Click <strong>Find Call Letters</strong> to see eligible exams.</li>
              <li>Download and print on A4 paper. Photocopies are not accepted.</li>
              <li>Affix passport photo and sign in presence of invigilator.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}
