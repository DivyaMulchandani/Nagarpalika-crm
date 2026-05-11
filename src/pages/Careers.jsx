import { useState } from 'react'
import { useLang } from '../context/LangContext'
import { JOBS } from '../data/jobs'

const STATUS_LABEL = { urgent: 'Closing Soon', new: 'New', closed: 'Closed', active: 'Active' }

export default function Careers() {
  const { t } = useLang()
  const [filter, setFilter] = useState('all')

  const visible = filter === 'all' ? JOBS : JOBS.filter(j => j.cls === filter)
  const counts = {
    all: JOBS.length,
    I:   JOBS.filter(j => j.cls === 'I').length,
    II:  JOBS.filter(j => j.cls === 'II').length,
    III: JOBS.filter(j => j.cls === 'III').length,
  }

  const FILTERS = [
    { k: 'all', i: 'car.filter.all', l: 'All' },
    { k: 'I',   i: 'car.filter.1',   l: 'Class I' },
    { k: 'II',  i: 'car.filter.2',   l: 'Class II' },
    { k: 'III', i: 'car.filter.3',   l: 'Class III' },
  ]

  return (
    <>
      <div className="page-heading">
        <h1>{t('car.h')}</h1>
        <span className="guj">{t('car.guj')}</span>
      </div>

      <div className="advt-banner">
        <div>
          <div className="meta" style={{ textTransform: 'uppercase', letterSpacing: '.1em' }}>Advertisement No.</div>
          <div className="num">UD / 2026 / 04</div>
        </div>
        <div className="meta" style={{ textAlign: 'right' }}>
          Issued <strong>28/04/2026</strong><br />
          Last Date: <strong style={{ color: '#fff' }}>22/05/2026 — 23:59 IST</strong>
        </div>
      </div>

      <div className="notice info">
        <div className="title">{t('car.notice.title')}</div>
        <span>{t('car.notice.body')}</span>
      </div>

      <div className="filter-row">
        <span className="label">{t('car.filter.label')}</span>
        {FILTERS.map(f => (
          <button
            key={f.k}
            className={`chip${filter === f.k ? ' active' : ''}`}
            onClick={() => setFilter(f.k)}
          >
            <span>{t(f.i) || f.l}</span>
            <span className="count">({counts[f.k]})</span>
          </button>
        ))}
      </div>

      <div className="box">
        <div className="box-title">
          <span>Open Positions — Department of Urban Development</span>
          <span className="guj">શહેરી વિકાસ વિભાગ — ખાલી જગ્યાઓ</span>
        </div>
        <table className="ojas">
          <thead>
            <tr>
              <th style={{ width: 36 }}>Sr.</th>
              <th style={{ width: 110 }}>Advt. No.</th>
              <th>Name of Post</th>
              <th style={{ width: 90 }}>Class</th>
              <th style={{ width: 60 }}>Posts</th>
              <th style={{ width: 70 }}>Fee</th>
              <th style={{ width: 90 }}>Last Date</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 90 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((j, i) => (
              <tr key={j.id}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{j.id}</td>
                <td>
                  <a href="#">{j.title}</a>
                  <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 2 }}>{j.dept}</div>
                  <div style={{ fontSize: 11, color: 'var(--ojas-ink-2)', marginTop: 2 }}>Pay: {j.scale}</div>
                </td>
                <td style={{ fontWeight: 700 }}>{j.cls}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ojas-navy)' }}>{j.posts}</td>
                <td>{j.fee}</td>
                <td style={{ color: j.status === 'urgent' ? 'var(--ojas-red)' : 'inherit', fontWeight: j.status === 'urgent' ? 700 : 400 }}>{j.last}</td>
                <td><span className={`badge ${j.status}`}>{STATUS_LABEL[j.status]}</span></td>
                <td>
                  <a href="#" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>{t('car.apply')}</a>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>No positions match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ojas-ink-3)', textAlign: 'center' }}>
        OTR (One Time Registration) does <strong style={{ color: 'var(--ojas-red)' }}>NOT</strong> mean your application is accepted.{' '}
        <span style={{ fontFamily: 'var(--font-guj)' }}>OTR નો અર્થ એ નથી કે તમારી અરજી સ્વીકારાઈ ગઈ છે.</span>
      </div>
    </>
  )
}
