import { useState, useEffect } from 'react'
import { get } from '../api/index'

const HELPLINE_TEXT = 'OJAS Helpdesk: 1800 233 5500 (Toll Free)  ·  Monday to Saturday, 09:00 – 18:00  ·  For portal support and recruitment queries'
const HELPLINE_ITEMS = Array(6).fill(HELPLINE_TEXT)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

function NoticeModal({ notice, onClose }) {
  if (!notice) return null
  const pdfUrl = notice.pdf_path
    ? `${import.meta.env.VITE_API_URL}/api/v1/notices/${notice._id}/pdf`
    : null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
        <div className="box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice.title}</span>
          <button type="button" className="btn-link" onClick={onClose} style={{ fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div className="box-body">
          {notice.publish_date && (
            <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)', marginBottom: 12 }}>{fmtDate(notice.publish_date)}</div>
          )}
          {notice.body && <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notice.body}</p>}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn primary" style={{ marginTop: 16, display: 'inline-block' }}>
              Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SiteMarquee() {
  const [notices, setNotices] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    get('/api/v1/notices', { status: 'published', limit: 50 })
      .then(res => setNotices(res?.data || []))
      .catch(() => {})
  }, [])

  const noticeItems = notices.length
    ? notices.flatMap(n => Array(3).fill(n))
    : []

  return (
    <>
      <div className="marquee marquee--helpline">
        <div className="marquee-tag marquee-tag--green">HELPLINE</div>
        <div className="marquee-track-wrap">
          <div className="marquee-track marquee-track--slow">
            {[...HELPLINE_ITEMS, ...HELPLINE_ITEMS].map((text, i) => (
              <span key={i} className="item">
                <span className="arrow">▶</span>{text}
              </span>
            ))}
          </div>
        </div>
      </div>
      {notices.length > 0 && (
        <div className="marquee">
          <div className="marquee-tag">LATEST</div>
          <div className="marquee-track-wrap">
            <div className="marquee-track">
              {[...noticeItems, ...noticeItems].map((n, i) => (
                <button
                  key={`${n._id}-${i}`}
                  type="button"
                  className="item"
                  onClick={() => setSelected(n)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}
                >
                  <span className="arrow">▶</span>
                  {n.title}{n.publish_date ? ` (${fmtDate(n.publish_date)})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <NoticeModal notice={selected} onClose={() => setSelected(null)} />
    </>
  )
}
