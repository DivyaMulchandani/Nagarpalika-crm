import { useRef, useEffect } from 'react'
import { IconCheck } from '../../components/Icons'

export default function StepIndicator({ total, current }) {
  const containerRef = useRef(null)
  const activeRef    = useRef(null)

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const el  = activeRef.current
      const box = containerRef.current
      box.scrollLeft = el.offsetLeft - box.offsetWidth / 2 + el.offsetWidth / 2
    }
  }, [current])

  return (
    <div ref={containerRef} className="step-indicator">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done   = n < current
        const active = n === current
        return (
          <div key={n} ref={active ? activeRef : null} style={{ display: 'flex', alignItems: 'center', flex: n < total ? 1 : 0 }}>
            <div className="step-dot" style={{
              borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
              background: done ? '#2a7a2a' : active ? 'var(--ojas-saffron-deep)' : 'var(--ojas-line)',
              color: done || active ? '#fff' : 'var(--ojas-ink-2)',
            }}>
              {done ? <IconCheck /> : n}
            </div>
            {n < total && (
              <div className="step-connector" style={{ flex: 1, height: 2, background: done ? '#2a7a2a' : 'var(--ojas-line)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
