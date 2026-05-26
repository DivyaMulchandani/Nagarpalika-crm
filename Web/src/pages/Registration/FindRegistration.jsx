import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../../api/index'

export default function FindRegistration() {
  const navigate = useNavigate()
  const [regId, setRegId]       = useState('')
  const [dob, setDob]           = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!regId.trim() || !dob || !password) { setError('Please fill in all fields.'); return }
    setError(null)
    setLoading(true)
    try {
      await post('/api/v1/candidates/login', { registration_id: regId.trim(), dob, password })
      navigate('/application')
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check your Registration ID, Date of Birth, and Password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Find / Login to Your Registration</h1>
        <span className="guj">નોંધણી શોધો / લૉગિન</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="box">
          <div className="box-title"><span>Candidate Login</span></div>
          <div className="box-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label>Registration ID *</label>
                  <input type="text" placeholder="e.g. OTR2026001234" value={regId} onChange={(e) => setRegId(e.target.value)} autoComplete="username" />
                </div>
                <div className="form-field">
                  <label>Date of Birth *</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Password *</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
                <div className="form-actions">
                  <button type="submit" className="btn primary" disabled={loading}>
                    {loading ? 'Logging in…' : 'Login'}
                  </button>
                </div>
              </div>
            </form>
            <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--ojas-line)', paddingTop: 12 }}>
              Not registered yet?{' '}
              <a href="/registration/apply/step/1" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Register Now ▶</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
