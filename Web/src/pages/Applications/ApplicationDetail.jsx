import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, BASE } from '../../api/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'
const statusColor = { submitted: '#2a7a2a', under_review: 'var(--ojas-saffron-deep)', shortlisted: 'var(--ojas-navy)', rejected: 'var(--ojas-red)', selected: '#2a7a2a' }

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value ?? '—'}</div>
    </div>
  )
}

export default function ApplicationDetail() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    get(`/api/v1/applications/${encodeURIComponent(ref)}`)
      .then((res) => setApp(res?.data ?? null))
      .catch((e) => setError(e.message || 'Failed to load application'))
      .finally(() => setLoading(false))
  }, [ref])

  const downloadPdf = async () => {
    const res = await fetch(`${BASE}/api/v1/applications/${encodeURIComponent(ref)}/pdf`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to download PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `application-${ref}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>

  if (error || !app) {
    return (
      <>
        <div className="page-heading"><h1>Application Detail</h1></div>
        <div className="notice warn">
          <div className="title">Not found</div>
          {error || 'This application could not be found.'}
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => navigate('/applications')}>← Back to Applications</button>
      </>
    )
  }

  const { candidate = {}, advertisement = {} } = app

  return (
    <>
      <div className="page-heading">
        <h1>Application Detail</h1>
        <span className="guj">અરજીની વિગત</span>
      </div>

      <div className="box" style={{ marginBottom: 16 }}>
        <div className="box-title"><span>Application</span></div>
        <div className="box-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="Reference No." value={app.application_ref_no} />
          <Field label="Status" value={<span style={{ fontWeight: 700, color: statusColor[app.status] || 'inherit' }}>{app.status?.replace(/_/g, ' ').toUpperCase()}</span>} />
          <Field label="Submitted" value={fmtDate(app.submitted_at)} />
          <Field label="Exam Centre" value={app.exam_centre} />
          <Field label="Experience (yrs)" value={app.experience_years} />
          <Field label="Declaration Accepted" value={app.declaration_accepted ? 'Yes' : 'No'} />
        </div>
      </div>

      <div className="box" style={{ marginBottom: 16 }}>
        <div className="box-title"><span>Post Applied For</span></div>
        <div className="box-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="Advt. No." value={advertisement.advt_no} />
          <Field label="Post" value={advertisement.post_title?.en} />
          <Field label="Class" value={advertisement.class} />
          <Field label="Pay Scale" value={advertisement.pay_scale} />
          <Field label="Department" value={advertisement.department?.departmentName} />
          <Field label="Application Fee" value={advertisement.application_fee ? `₹${advertisement.application_fee}` : 'Free'} />
          <Field label="Last Date" value={fmtDate(advertisement.end_date)} />
        </div>
      </div>

      <div className="box" style={{ marginBottom: 16 }}>
        <div className="box-title"><span>Applicant</span></div>
        <div className="box-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="Name" value={candidate.name} />
          <Field label="Father/Husband Name" value={candidate.father_husband_name} />
          <Field label="DOB" value={fmtDate(candidate.dob)} />
          <Field label="Gender" value={candidate.gender} />
          <Field label="Category" value={candidate.category} />
          <Field label="Mobile" value={candidate.mobile} />
          <Field label="Email" value={candidate.email} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={() => downloadPdf().catch(() => setError('Failed to download PDF'))}>Download PDF</button>
        <button className="btn" onClick={() => navigate('/applications')}>← Back to Applications</button>
      </div>
    </>
  )
}
