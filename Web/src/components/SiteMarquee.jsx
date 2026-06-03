import { useState, useEffect } from 'react'
import { get } from '../api/index'

const HELPLINE_TEXT = 'OJAS Helpdesk: 1800 233 5500 (Toll Free)  ·  Monday to Saturday, 09:00 – 18:00  ·  For portal support and recruitment queries'
const HELPLINE_ITEMS = Array(6).fill(HELPLINE_TEXT)

export default function SiteMarquee() {
  const [headline, setHeadline] = useState('')

  useEffect(() => {
    get('/api/v1/notices', { status: 'published', limit: 1 })
      .then(res => setHeadline(res?.data?.[0]?.title || ''))
      .catch(() => {})
  }, [])

  const headlineItems = headline ? Array(6).fill(headline) : []

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
      {headline && (
        <div className="marquee">
          <div className="marquee-tag">LATEST</div>
          <div className="marquee-track-wrap">
            <div className="marquee-track">
              {[...headlineItems, ...headlineItems].map((text, i) => (
                <span key={i} className="item">
                  <span className="arrow">▶</span>{text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
