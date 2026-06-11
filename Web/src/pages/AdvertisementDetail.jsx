import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { get } from '../api/index'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const isClosingSoon = (d) => {
  if (!d) return false
  const diff = new Date(d) - Date.now()
  return diff > 0 && diff < 7 * 86400 * 1000
}

const VACANCY_CATS = [
  { key: 'general', label: 'General (UR)' },
  { key: 'obc',     label: 'OBC' },
  { key: 'sc',      label: 'SC' },
  { key: 'st',      label: 'ST' },
  { key: 'ews',     label: 'EWS' },
]

function InfoRow({ label, value, highlight }) {
  if (!value && value !== 0) return null
  return (
    <tr>
      <td style={{ fontWeight: 600, width: '40%', color: 'var(--ojas-ink-2)', padding: '7px 12px', borderBottom: '1px solid var(--ojas-line)', verticalAlign: 'top' }}>
        {label}
      </td>
      <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--ojas-line)', color: highlight ? 'var(--ojas-red)' : 'inherit', fontWeight: highlight ? 700 : 400 }}>
        {value}
      </td>
    </tr>
  )
}

export default function AdvertisementDetail() {
  const { slug }  = useParams()
  const id        = slug
  const navigate  = useNavigate()
  const [advt, setAdvt]     = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    get(`/api/v1/advertisements/${id}`)
      .then(res => {
        if (!res?.data) { setStatus('not_found'); return }
        setAdvt(res.data)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'loading') {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--ojas-ink-3)' }}>Loading…</div>
  }

  if (status === 'not_found' || status === 'error') {
    return (
      <>
        <div className="page-heading"><h1>Advertisement Not Found</h1></div>
        <div className="notice warn" style={{ maxWidth: 520, margin: '32px auto' }}>
          <div className="title">{status === 'error' ? 'Error Loading' : 'Not Found'}</div>
          Could not load advertisement. <Link to="/careers" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Browse all openings →</Link>
        </div>
      </>
    )
  }

  const closing  = isClosingSoon(advt.end_date)
  const isClosed = advt.status === 'Closed' || advt.status === 'Archived'
  const hasVacBreakdown = VACANCY_CATS.some(c => advt.vacancies?.[c.key] > 0)

  const badgeStyle = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 700,
    background: isClosed ? '#e74c3c' : closing ? '#e67e22' : '#27ae60',
    color: '#fff',
    marginLeft: 10,
    verticalAlign: 'middle',
  }

  return (
    <>
      {/* ── Breadcrumb ── */}
      <div className="breadcrumb-bar" style={{ fontSize: 12.5, color: 'var(--ojas-ink-3)', marginBottom: 8 }}>
        <Link to="/careers" style={{ color: 'var(--ojas-navy)', textDecoration: 'none' }}>Current Openings</Link>
        {' › '}
        <span>{advt.advt_no}</span>
      </div>

      {/* ── Page Heading ── */}
      <div className="page-heading">
        <h1>
          {advt.post_title?.en}
          <span style={badgeStyle}>
            {isClosed ? 'Closed' : closing ? 'Closing Soon' : 'Active'}
          </span>
        </h1>
        {advt.post_title?.gu && (
          <span className="guj" style={{ display: 'block', marginTop: 4 }}>{advt.post_title.gu}</span>
        )}
      </div>

      {/* ── Advt No + Dept badges ── */}
      <div className="badge-row">
        <span style={{ background: 'var(--ojas-navy)', color: '#fff', padding: '4px 12px', borderRadius: 3, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          {advt.advt_no}
        </span>
        <span style={{ background: 'var(--ojas-saffron)', color: 'var(--ojas-navy)', padding: '4px 12px', borderRadius: 3, fontSize: 12.5, fontWeight: 700 }}>
          Class {advt.class}
        </span>
        {advt.department?.departmentName && (
          <span style={{ background: 'var(--ojas-bg-2)', color: 'var(--ojas-ink-2)', padding: '4px 12px', borderRadius: 3, fontSize: 12.5, border: '1px solid var(--ojas-line)' }}>
            {advt.department.departmentName}
          </span>
        )}
      </div>

      <div className="detail-grid">

        {/* ── Key Details ── */}
        <div className="box">
          <div className="box-title">
            <span>Advertisement Details</span>
            <span className="guj">જાહેરાત વિગત</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              <InfoRow label="Advertisement No." value={advt.advt_no} />
              <InfoRow label="Post Title (English)" value={advt.post_title?.en} />
              {advt.post_title?.gu && (
                <tr>
                  <td style={{ fontWeight: 600, width: '40%', color: 'var(--ojas-ink-2)', padding: '7px 12px', borderBottom: '1px solid var(--ojas-line)', fontFamily: 'var(--font-guj)' }}>
                    પોસ્ટ નું નામ (ગુ.)
                  </td>
                  <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--ojas-line)', fontFamily: 'var(--font-guj)' }}>
                    {advt.post_title.gu}
                  </td>
                </tr>
              )}
              <InfoRow label="Department" value={advt.department?.departmentName} />
              <InfoRow label="Class" value={`Class ${advt.class}`} />
              <InfoRow label="Pay Scale" value={advt.pay_scale} />
              <InfoRow label="Total Vacancies" value={advt.vacancies?.total} />
              <InfoRow label="Age Limit" value={
                advt.age_limit?.min || advt.age_limit?.max
                  ? `${advt.age_limit.min ?? '—'} – ${advt.age_limit.max ?? '—'} years`
                  : null
              } />
              <InfoRow label="Application Fee" value={
                advt.application_fee ? `₹ ${advt.application_fee}` : 'Free'
              } />
              <InfoRow label="Application Start Date" value={fmtDate(advt.start_date)} />
              <InfoRow label="Last Date to Apply" value={fmtDate(advt.end_date)} highlight={closing} />
              <InfoRow label="Probation Period" value={advt.probation_period} />
              <InfoRow label="Status" value={
                isClosed ? 'Closed' : closing ? '⚠ Closing Soon' : 'Active'
              } highlight={closing} />
            </tbody>
          </table>
        </div>

        {/* ── Vacancies Breakdown ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasVacBreakdown && (
            <div className="box">
              <div className="box-title">
                <span>Vacancies Breakdown</span>
                <span className="guj">ખાલી જગ્યાઓ</span>
              </div>
              <table className="ojas" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'center', width: 80 }}>Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {VACANCY_CATS.filter(c => advt.vacancies?.[c.key] > 0).map(c => (
                    <tr key={c.key}>
                      <td>{c.label}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{advt.vacancies[c.key]}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--ojas-bg-2)', fontWeight: 700 }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ojas-navy)' }}>{advt.vacancies?.total ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── Important Dates card ── */}
          <div className="box">
            <div className="box-title">
              <span>Important Dates</span>
              <span className="guj">મહત્ત્વની તારીખો</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <tbody>
                <InfoRow label="Start Date" value={fmtDate(advt.start_date)} />
                <InfoRow label="Last Date" value={fmtDate(advt.end_date)} highlight={closing} />
              </tbody>
            </table>
            {closing && (
              <div style={{ padding: '8px 12px', background: '#fff3cd', borderTop: '1px solid #ffc107', fontSize: 12.5, color: '#856404', fontWeight: 600 }}>
                ⚠ This advertisement is closing soon. Apply before the last date.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Qualifications & Conditions ── */}
      {(advt.qualification || advt.experience_required || advt.ph_description || advt.other_conditions || advt.note) && (
        <div className="box" style={{ marginTop: 16 }}>
          <div className="box-title">
            <span>Eligibility &amp; Conditions</span>
            <span className="guj">પાત્રતા અને શરતો</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {advt.qualification && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ojas-navy)', marginBottom: 4 }}>Educational Qualification</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{advt.qualification}</p>
              </div>
            )}

            {advt.experience_required && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ojas-navy)', marginBottom: 4 }}>Experience Required</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{advt.experience_required}</p>
              </div>
            )}

            {advt.ph_description && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ojas-navy)', marginBottom: 4 }}>PH / Differently Abled</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{advt.ph_description}</p>
              </div>
            )}

            {advt.other_conditions && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ojas-navy)', marginBottom: 4 }}>Other Conditions</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{advt.other_conditions}</p>
              </div>
            )}

            {advt.note && (
              <div style={{ background: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 4, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ojas-red)', marginBottom: 4 }}>⚠ Important Note</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--ojas-red)', whiteSpace: 'pre-wrap' }}>{advt.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="action-bar">
        {!isClosed && (
          <Link
            to={`/apply/${advt.slug || advt._id}`}
            style={{
              background: 'var(--ojas-navy)',
              color: '#fff',
              padding: '10px 28px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              borderRadius: 3,
              display: 'inline-block',
            }}
          >
            Apply Online →
          </Link>
        )}
        {advt.pdf_path && (
          <a
            href={`${import.meta.env.VITE_API_URL}/api/v1/advertisements/${advt._id}/pdf`}
            target="_blank"
            rel="noreferrer"
            download
            style={{
              background: 'var(--ojas-saffron)',
              color: 'var(--ojas-navy)',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              borderRadius: 3,
              display: 'inline-block',
            }}
          >
            📄 Download Official PDF
          </a>
        )}
        <Link
          to="/careers"
          style={{ fontSize: 13.5, color: 'var(--ojas-ink-3)', textDecoration: 'none', marginLeft: 4 }}
        >
          ← Back to All Openings
        </Link>
      </div>

      {/* ── Disclaimer ── */}
      <div className="adv-disclaimer" style={{ marginTop: 20, fontSize: 11.5, color: 'var(--ojas-ink-3)', borderTop: '1px solid var(--ojas-line)', paddingTop: 12 }}>
        OTR (One Time Registration) does <strong style={{ color: 'var(--ojas-red)' }}>NOT</strong> mean your application is accepted.{' '}
        <span style={{ fontFamily: 'var(--font-guj)' }}>OTR નો અર્થ એ નથી કે તમારી અરજી સ્વીકારાઈ ગઈ છે.</span>
      </div>
    </>
  )
}
