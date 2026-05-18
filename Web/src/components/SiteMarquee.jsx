import { MARQUEE_ITEMS } from '../data/marqueeItems'

const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

export default function SiteMarquee() {
  return (
    <div className="marquee">
      <div className="marquee-tag">LATEST</div>
      <div className="marquee-track-wrap">
        <div className="marquee-track" id="marquee-track">
          {items.map((text, i) => (
            <span key={i} className="item">
              <span className="arrow">▶</span>{text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
