import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { get } from '../../api/index'
import { IconPrint } from '../../components/Icons'

const BASE = import.meta.env.VITE_API_URL || ''

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN') : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'

function Row({ label, value, mono, guj }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <tr>
      <td style={{ width: 200, color: 'var(--ojas-ink-3)' }}>{label}</td>
      <td style={{ fontFamily: mono ? 'var(--font-mono)' : guj ? 'var(--font-guj)' : 'inherit' }}>{value}</td>
    </tr>
  )
}

function SectionRow({ title }) {
  return (
    <tr>
      <td colSpan={2} style={{ background: 'var(--ojas-cream)', fontWeight: 700, fontSize: 12, paddingTop: 10 }}>
        {title}
      </td>
    </tr>
  )
}

export default function PrintApplication() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const ref       = state?.ref

  const [app, setApp]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!ref) { navigate('/application', { replace: true }); return }
    get(`/api/v1/applications/${encodeURIComponent(ref)}`)
      .then(res => setApp(res?.data))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [ref, navigate])

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>
  if (error)   return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ojas-red)' }}>{error}</div>
  if (!app)    return null

  const cand = app.candidate
  const advt = app.advertisement

  return (
    <>
      <div className="page-heading no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1>Application Printout</h1>
          <span className="guj">અરજી પ્રિન્ટ</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => window.print()}><IconPrint /> Print</button>
          <a
            className="btn"
            href={`${BASE}/api/v1/applications/${encodeURIComponent(ref)}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
          <button className="btn" onClick={() => navigate('/application')}>← Back</button>
        </div>
      </div>

      <div className="box print-area" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="box-title">
          <span>Online Application — {app.advt_no}</span>
          <span className="guj">ઓનલાઇન અરજી</span>
        </div>
        <div className="box-body">
          <table className="ojas kv">
            <tbody>
              <Row label="Application Ref No." value={app.application_ref_no} mono />
              <Row label="Advertisement No." value={app.advt_no} mono />
              <Row label="Status" value={app.status?.replace(/_/g, ' ').toUpperCase()} />
              <Row label="Submitted At" value={fmtDateTime(app.submitted_at)} />
              <Row label="Exam Centre" value={app.exam_centre} />

              {advt && (
                <>
                  <SectionRow title="Post Details" />
                  <Row label="Post" value={advt.post_title?.en} />
                  {advt.post_title?.gu && <Row label="Post (Gujarati)" value={advt.post_title.gu} guj />}
                  <Row label="Class" value={advt.class && `Class ${advt.class}`} />
                  <Row label="Department" value={advt.department?.departmentName} />
                  <Row label="Pay Scale" value={advt.pay_scale} />
                  <Row label="Application Fee" value={advt.application_fee ? `₹${advt.application_fee}` : 'No fee'} />
                  <Row label="Last Date" value={fmtDate(advt.end_date)} />
                </>
              )}

              {cand && (
                <>
                  <SectionRow title="Candidate Details" />
                  <Row label="Registration ID" value={cand.registration_id} mono />
                  <Row label="Name" value={cand.name} />
                  <Row label="Father / Husband Name" value={cand.father_husband_name} />
                  <Row label="Date of Birth" value={fmtDate(cand.dob)} />
                  <Row label="Gender" value={cand.gender} />
                  <Row label="Category" value={cand.category} />
                  <Row label="Mobile" value={cand.mobile} />
                  <Row label="Email" value={cand.email} />
                </>
              )}

              <SectionRow title="Declaration" />
              <Row
                label="Declaration Accepted"
                value={app.declaration_accepted ? 'Yes — the candidate has declared all OTR profile information to be true and correct.' : 'No'}
              />
            </tbody>
          </table>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <div>
              <div style={{ borderTop: '1px solid var(--ojas-ink-3)', width: 160, paddingTop: 4 }}>Candidate Signature</div>
            </div>
            <div style={{ textAlign: 'right', color: 'var(--ojas-ink-3)' }}>
              Generated on {new Date().toLocaleString('en-IN')}
            </div>
          </div>

          <div className="notice warn no-print" style={{ marginTop: 16, fontSize: 12 }}>
            This is a system-generated printout. Keep it for your records. For examination hall tickets, visit the Call Letter section.
          </div>
        </div>
      </div>
    </>
  )
}
