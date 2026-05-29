import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../../api/index'

export default function CallLetterCheck() {
  const navigate = useNavigate()
  const [regId, setRegId]     = useState('')
  const [dob, setDob]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!regId.trim() || !dob) { setError('Please fill in all fields.'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await get('/api/v1/call-letters/check', { registration_id: regId.trim(), dob })
      navigate('/callletter/result', { state: { results: res.data || [], regId: regId.trim() } })
    } catch (err) {
      setError(err.message || 'No call letters found for this registration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field">
                    <label>Registration ID (OTR ID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. OTR2026001234"
                      value={regId}
                      onChange={(e) => setRegId(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-field">
                    <label>Date of Birth *</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
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
