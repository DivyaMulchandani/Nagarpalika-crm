import { useState, useEffect } from 'react'
import { get } from '../api/index'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export default function SiteMarquee() {
  const [items, setItems] = useState([])

  useEffect(() => {
    Promise.all([
      get('/api/v1/advertisements', { status: 'Published', limit: 5 }),
      get('/api/v1/notices', { status: 'published', limit: 10 }),
    ]).then(([adsRes, noticesRes]) => {
      const adItems = (adsRes?.data || []).map(a =>
        `${a.advt_no} — ${a.post_title?.en || ''}${a.end_date ? ' · Last date ' + fmtDate(a.end_date) : ''}`
      )
      const noticeItems = (noticesRes?.data || []).map(n => n.title)
      setItems([...adItems, ...noticeItems])
    }).catch(() => {})
  }, [])

  if (!items.length) return null

  const display = [...items, ...items]

  return (
    <div className="marquee">
      <div className="marquee-tag">LATEST</div>
      <div className="marquee-track-wrap">
        <div className="marquee-track" id="marquee-track">
          {display.map((text, i) => (
            <span key={i} className="item">
              <span className="arrow">▶</span>{text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
