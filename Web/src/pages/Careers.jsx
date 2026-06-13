import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { get } from '../api/index'
import { IconPdf, IconSearch } from '../components/Icons'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
// vacancies is a single number; legacy records may still hold {total, ...}
const vacCount = (v) => (typeof v === 'object' ? v?.total : v)
const isClosingSoon = (d) => { if (!d) return false; const diff = new Date(d) - Date.now(); return diff > 0 && diff < 7 * 86400 * 1000 }

export default function Careers() {
  const { t } = useLang()
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    get('/api/v1/advertisements', { status: 'Published', limit: 100 })
      .then(res => setJobs(res?.data || []))
      .catch(() => setError('Failed to load advertisements'))
      .finally(() => setLoading(false))
  }, [])

  const visible = jobs

  return (
    <>
      <div className="page-heading">
        <h1>{t('car.h')}</h1>
        <span className="guj">{t('car.guj')}</span>
      </div>

      <div className="notice info">
        <div className="title">{t('car.notice.title')}</div>
        <span>{t('car.notice.body')}</span>
      </div>


      <div className="box">
        <div className="box-title">
          <span>Open Positions</span>
          <span className="guj">ખાલી જગ્યાઓ</span>
        </div>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ojas-ink-3)' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ojas-red)' }}>{error}</div>
        ) : (
          <table className="ojas">
            <thead>
              <tr>
                <th style={{ width: 36 }}>Sr.</th>
                <th style={{ width: 120 }}>Advt. No.</th>
                <th>Name of Post</th>
                <th style={{ width: 80 }}>Class</th>
                <th style={{ width: 60 }}>Posts</th>
                <th style={{ width: 70 }}>Fee</th>
                <th style={{ width: 100 }}>Last Date</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 70 }}>PDF</th>
                <th style={{ width: 70 }}>Details</th>
                <th style={{ width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j, i) => {
                const closing = isClosingSoon(j.end_date)
                return (
                  <tr key={j._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{j.advt_no}</td>
                    <td>
                      <Link to={`/advertisement/${j.slug || j._id}`} style={{ fontWeight: 600, color: 'var(--ojas-navy)', textDecoration: 'none' }}>{j.post_title?.en}</Link>
                      {j.post_title?.gu && <div style={{ fontSize: 11, fontFamily: 'var(--font-guj)', color: 'var(--ojas-ink-3)', marginTop: 2 }}>{j.post_title.gu}</div>}
                      {j.department?.departmentName && <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 2 }}>{j.department.departmentName}</div>}
                      {j.pay_scale && <div style={{ fontSize: 11, color: 'var(--ojas-ink-2)', marginTop: 2 }}>Pay: {j.pay_scale}</div>}
                      {j.note && <div style={{ fontSize: 11, color: 'var(--ojas-red)', marginTop: 4, fontStyle: 'italic' }}>Note: {j.note}</div>}
                    </td>
                    <td style={{ fontWeight: 700 }}>{j.class}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ojas-navy)' }}>{vacCount(j.vacancies) ?? '—'}</td>
                    <td>{j.application_fee ? `₹${j.application_fee}` : 'Free'}</td>
                    <td style={{ color: closing ? 'var(--ojas-red)' : 'inherit', fontWeight: closing ? 700 : 400 }}>{fmtDate(j.end_date)}</td>
                    <td><span className={`badge ${j.status === 'Closed' ? 'closed' : closing ? 'urgent' : 'active'}`}>{j.status === 'Closed' ? 'Closed' : closing ? 'Closing Soon' : 'Active'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {j.pdf_path && (
                        <a href={`${import.meta.env.VITE_API_URL}/api/v1/advertisements/${j._id}/pdf`} target="_blank" rel="noreferrer" download style={{ color: 'var(--ojas-red)', fontWeight: 700, fontSize: 13 }} title="Download PDF"><IconPdf style={{ fontSize: 16 }} /></a>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link to={`/advertisement/${j.slug || j._id}`} style={{ color: 'var(--ojas-navy)', fontWeight: 700, fontSize: 13 }} title="View Details"><IconSearch style={{ fontSize: 16 }} /></Link>
                    </td>
                    <td>
                      {j.status !== 'Closed' && <Link to={`/apply/${j.slug || j._id}`} style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>{t('car.apply')}</Link>}
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>No positions match this filter.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ojas-ink-3)', textAlign: 'center' }}>
        OTR (One Time Registration) does <strong style={{ color: 'var(--ojas-red)' }}>NOT</strong> mean your application is accepted.{' '}
        <span style={{ fontFamily: 'var(--font-guj)' }}>OTR નો અર્થ એ નથી કે તમારી અરજી સ્વીકારાઈ ગઈ છે.</span>
      </div>
    </>
  )
}
