export default function StepIndicator({ total, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, overflowX: 'auto' }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done   = n < current
        const active = n === current
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < total ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: done ? '#2a7a2a' : active ? 'var(--ojas-saffron-deep)' : 'var(--ojas-line)',
              color: done || active ? '#fff' : 'var(--ojas-ink-2)',
            }}>
              {done ? '✓' : n}
            </div>
            {n < total && (
              <div style={{ flex: 1, height: 2, background: done ? '#2a7a2a' : 'var(--ojas-line)', minWidth: 8 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
