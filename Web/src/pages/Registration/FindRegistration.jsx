import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CandidateLogin from '../../components/CandidateLogin'

// Only allow internal redirect targets — never off-site URLs
const safeRedirect = (raw) =>
  raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/application'

export default function FindRegistration() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const handleSuccess = async () => {
    await refresh() // hydrate auth context so header/protected routes update
    navigate(redirectTo, { replace: true })
  }

  return (
    <>
      <Link to="/" className="btn-back">← Back to Home</Link>

      <div className="page-heading">
        <h1>Candidate Login</h1>
        <span className="guj">ઉમેદવાર લૉગિન</span>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="notice info" style={{ marginBottom: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <strong style={{ fontSize: 13.5, color: 'var(--ojas-navy-deep)', display: 'block', marginBottom: 2 }}>
                New Candidate? / નવા ઉમેદવાર?
              </strong>
              <span style={{ fontSize: 12, color: 'var(--ojas-ink-2)' }}>
                One-Time Registration (OTR) is mandatory before applying.
              </span>
            </div>
            <Link
              to="/registration"
              className="btn primary"
              style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Register (OTR) ▶
            </Link>
          </div>
        </div>

        <CandidateLogin onSuccess={handleSuccess} />
      </div>
    </>
  )
}
