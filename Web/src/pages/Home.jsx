import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { get } from '../api/index'


const NEWS_TAG_MAP = {
  notice:      { cls: 'notice',  label: 'Notice'  },
  circular:    { cls: 'notice',  label: 'Circular' },
  press:       { cls: 'press',   label: 'Press'   },
  recruitment: { cls: 'recruit', label: 'Recruit' },
  tender:      { cls: 'tender',  label: 'Tender'  },
}

const VM_TAG_LABELS = { new: 'NEW', urgent: 'URGENT', rel: 'RELEASE' }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtDayMo = (d) => {
  if (!d) return { day: '—', mo: '' }
  const dt = new Date(d)
  return {
    day: String(dt.getDate()).padStart(2, '0'),
    mo: dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  }
}
const isClosingSoon = (d) => { if (!d) return false; const diff = new Date(d) - Date.now(); return diff > 0 && diff < 7 * 86400 * 1000 }

function VmList({ ariaHidden, items }) {
  if (!items?.length) return null
  return (
    <ul className="vm-list" aria-hidden={ariaHidden || undefined}>
      {items.map((item, i) => (
        <li key={i}>
          <span className={`vm-tag ${item.tag}`}>{VM_TAG_LABELS[item.tag]}</span>
          <span>{item.bold && <strong>{item.bold}</strong>}{item.rest}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const { t } = useLang()
  const [ads, setAds]   = useState([])
  const [news, setNews] = useState([])

  useEffect(() => {
    get('/api/v1/advertisements', { status: 'Published', limit: 100 })
      .then(res => setAds(res?.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    get('/api/v1/notices', { status: 'published', limit: 5 })
      .then(res => setNews(res?.data || []))
      .catch(() => {})
  }, [])

  // Compute facts from live data
  const totalPosts     = ads.reduce((s, a) => s + (a.vacancies?.total || 0), 0)
  const activeAdvts    = ads.length
  const soonDates      = ads.map(a => a.end_date).filter(Boolean).sort()
  const nextLastDate   = soonDates[0] ? (() => { const d = new Date(soonDates[0]); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` })() : '—'

  const facts = [
    { n: String(totalPosts || '—'),  l: 'Open Posts'     },
    { n: String(activeAdvts || '—'), l: 'Active Advts.'  },
    { n: nextLastDate,               l: 'Next Last Date'  },
  ]

  // Vertical marquee items from live advertisements
  const liveItems = ads.map(a => ({
    tag:  isClosingSoon(a.end_date) ? 'urgent' : 'new',
    bold: a.advt_no,
    rest: ` — ${a.post_title?.en || ''}${a.end_date ? ' · Last date ' + fmtDate(a.end_date) : ''}`,
  }))

  return (
    <>
      <div className="hero-strip">
        <div className="eyebrow">{t('home.welcome.eyebrow')}</div>
        <h1>{t('home.welcome.h')}</h1>
        <div className="guj">{t('home.welcome.guj')}</div>
      </div>

      {facts.some(f => f.n !== '—' && f.n !== '0') && (
        <div className="fact-strip">
          {facts.map(f => (
            <div key={f.l} className="fact">
              <div className="n">{f.n}</div>
              <div className="l">{f.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="two-col">
        <div>
          {/* Open Advertisements */}
          <div className="box">
            <div className="box-title">
              <span>Open Advertisements</span>
              <span className="guj">ખુલ્લી જાહેરાતો</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              {ads.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>
                  No open advertisements at this time.
                </div>
              ) : (
                <table className="ojas">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>Sr.</th>
                      <th style={{ width: 120 }}>Advt. No.</th>
                      <th>Post</th>
                      <th style={{ width: 70 }}>Class</th>
                      <th style={{ width: 60 }}>Posts</th>
                      <th style={{ width: 100 }}>Last Date</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.slice(0, 8).map((a, i) => {
                      const closing = isClosingSoon(a.end_date)
                      return (
                        <tr key={a._id}>
                          <td>{i + 1}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.advt_no}</td>
                          <td>
                            <span style={{ fontWeight: 500 }}>{a.post_title?.en}</span>
                            {a.department?.departmentName && (
                              <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 2 }}>{a.department.departmentName}</div>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>{a.class}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ojas-navy)' }}>{a.vacancies?.total ?? '—'}</td>
                          <td style={{ color: closing ? 'var(--ojas-red)' : 'inherit', fontWeight: closing ? 700 : 400 }}>{fmtDate(a.end_date)}</td>
                          <td>
                            <span className={`badge ${closing ? 'urgent' : 'active'}`}>
                              {closing ? 'Closing Soon' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <Link to={`/apply/${a.slug || a._id}`} style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>Apply ▶</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {ads.length > 8 && (
                <div style={{ padding: '8px 12px', textAlign: 'right', borderTop: '1px solid var(--ojas-border)', background: 'var(--ojas-cream)' }}>
                  <Link to="/careers" style={{ fontWeight: 700 }}>View all {ads.length} advertisements ▶</Link>
                </div>
              )}
            </div>
          </div>

          {/* News from Notices */}
          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title">
              <span>{t('home.news.title')}</span>
              <span className="guj">{t('home.news.guj')}</span>
            </div>
            <div className="box-body">
              {news.length === 0 ? (
                <p style={{ color: 'var(--ojas-ink-3)', fontStyle: 'italic', textAlign: 'center' }}>No recent notices.</p>
              ) : (
                <ul className="news-list">
                  {news.map((n, i) => {
                    const { day, mo } = fmtDayMo(n.publish_date || n.createdAt)
                    const tagInfo = NEWS_TAG_MAP[n.type] || { cls: 'notice', label: n.type }
                    const href = n.pdf_path
                      ? `${import.meta.env.VITE_API_URL || ''}/api/v1/notices/${n._id}/pdf`
                      : '/notices'
                    return (
                      <li key={n._id || i}>
                        <div className="news-date">
                          <span className="news-day">{day}</span>
                          <span className="news-mo">{mo}</span>
                        </div>
                        <div className="news-body">
                          <h3>
                            <span className={`tag ${tagInfo.cls}`}>{tagInfo.label}</span>
                            {n.title}
                          </h3>
                          {n.body && n.body.replace(/<[^>]*>/g, '').trim() && (
                            <div className="news-excerpt" dangerouslySetInnerHTML={{ __html: n.body }} />
                          )}
                          <a href={href} target={n.pdf_path ? '_blank' : undefined} rel="noreferrer">Read full notice ▶</a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className="box">
            <div className="box-title saffron">
              <span>{t('home.up.title')}</span>
              <span className="guj">{t('home.up.guj')}</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              {liveItems.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>
                  No open advertisements.
                </div>
              ) : (
                <div className="vmarquee" aria-label="Latest releases marquee">
                  <div className="vmarquee-track">
                    <VmList items={liveItems} />
                    {liveItems.length >= 4 && <VmList items={liveItems} ariaHidden />}
                  </div>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--ojas-border)', padding: '8px 12px', textAlign: 'right', background: 'var(--ojas-cream)' }}>
                <Link to="/careers" style={{ fontWeight: 700 }}>View all advertisements ▶</Link>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title">
              <span>{t('home.ql.title')}</span>
              <span className="guj">{t('home.ql.guj')}</span>
            </div>
            <div className="box-body ql-grid">
              {[
                { label: 'How to Register',          to: '/registration' },
                { label: 'How to Apply',             to: '/careers' },
                { label: 'Apply',                    to: '/registration/find' },
                { label: 'Admit Card / Call Letter', to: '/callletter' },
                { label: 'Results',                  to: '/results' },
                { label: 'Help / Query',             to: '/contact' },
              ].map(({ label, to }) => (
                <Link key={label} to={to} className="ql-btn">
                  <span className="ql-arrow">▶</span>{label}
                </Link>
              ))}
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <div className="title">NOTE · નોંધ</div>
            Candidates are advised to read the advertisement carefully before applying online.{' '}
            <span style={{ fontFamily: 'var(--font-guj)' }}>ઓનલાઇન અરજી કરતાં પહેલાં જાહેરાત કાળજીપૂર્વક વાંચવી.</span>
          </div>
        </div>
      </div>
    </>
  )
}
