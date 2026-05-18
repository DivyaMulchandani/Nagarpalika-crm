const RESULTS = [
  { sr: 1, advt: 'UD/2025/14', exam: 'Junior Engineer (Civil) — Final Selection List',         declared: '02/05/2026', cutoff: '72.50', stage: 'active', stageLabel: 'Final',    dl: ['PDF', 'Excel'] },
  { sr: 2, advt: 'UD/2025/11', exam: 'Town Planning Assistant — Document Verification List',   declared: '28/04/2026', cutoff: '68.25', stage: 'new',    stageLabel: 'DV Round',  dl: ['PDF'] },
  { sr: 3, advt: 'UD/2025/09', exam: 'Surveyor / Draftsman — Final Result',                   declared: '22/04/2026', cutoff: '78.50', stage: 'active', stageLabel: 'Final',    dl: ['PDF', 'Excel'] },
  { sr: 4, advt: 'UD/2025/07', exam: 'Clerk-cum-Typist — Mains Result',                       declared: '18/04/2026', cutoff: '62.10', stage: 'info',   stageLabel: 'Mains',    dl: ['PDF'] },
  { sr: 5, advt: 'UD/2025/04', exam: 'Asst. Inspector (Building) — Preliminary Result',       declared: '10/04/2026', cutoff: '55.00', stage: 'info',   stageLabel: 'Prelim',   dl: ['PDF'] },
  { sr: 6, advt: 'UD/2024/22', exam: 'Accounts Officer — Final Selection List',               declared: '02/04/2026', cutoff: '74.80', stage: 'active', stageLabel: 'Final',    dl: ['PDF', 'Excel'] },
]

const ANSWER_KEYS = [
  'UD/2025/14 — Junior Engineer (Civil) — Final Answer Key · 12/04/2026',
  'UD/2025/11 — Town Planning Asst. — Provisional Answer Key · 05/04/2026',
  'UD/2025/09 — Surveyor / Draftsman — Final Answer Key · 28/03/2026',
  'UD/2025/07 — Clerk-cum-Typist — Mains Answer Key · 22/03/2026',
  'UD/2025/04 — Asst. Inspector — Provisional Key · 15/03/2026',
]

export default function Results() {
  return (
    <>
      <div className="page-heading">
        <h1>Examination Results &amp; Answer Keys</h1>
        <span className="guj">પરીક્ષા પરિણામ અને ઉત્તરકૂંચી</span>
      </div>

      <div className="notice info">
        <div className="title">NOTE · નોંધ</div>
        Results are published in PDF format. Candidates are advised to verify their roll number and category before raising any representation. Grievances against published results must be filed within <strong>15 days</strong> of declaration.{' '}
        <span style={{ fontFamily: 'var(--font-guj)' }}>પરિણામ સામેની ફરિયાદ ૧૫ દિવસમાં દાખલ કરવી.</span>
      </div>

      <div className="box">
        <div className="box-title">
          <span>Find Your Result</span>
          <span className="guj">તમારું પરિણામ શોધો</span>
        </div>
        <div className="box-body">
          <div className="form-row">
            <div className="form-field">
              <label>Advertisement No.</label>
              <select>
                <option>UD/2025/14 — Junior Engineer (Civil)</option>
                <option>UD/2025/11 — Town Planning Asst.</option>
                <option>UD/2025/09 — Surveyor / Draftsman</option>
                <option>UD/2025/07 — Clerk-cum-Typist</option>
              </select>
            </div>
            <div className="form-field">
              <label>Confirmation Number</label>
              <input type="text" placeholder="e.g. 1234567890" />
            </div>
            <div className="form-field">
              <label>Date of Birth (DD/MM/YYYY)</label>
              <input type="text" placeholder="DD/MM/YYYY" />
            </div>
            <div className="form-actions">
              <button className="btn primary">View Result</button>
              <button className="btn">Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div className="box" style={{ marginTop: 12 }}>
        <div className="box-title">
          <span>Recently Declared Results</span>
          <span className="guj">તાજેતરમાં જાહેર થયેલ પરિણામો</span>
        </div>
        <table className="ojas">
          <thead>
            <tr>
              <th style={{ width: 36 }}>Sr.</th>
              <th style={{ width: 130 }}>Advt. No.</th>
              <th>Examination</th>
              <th style={{ width: 110 }}>Declared</th>
              <th style={{ width: 80 }}>Cut-off</th>
              <th style={{ width: 120 }}>Stage</th>
              <th style={{ width: 110 }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {RESULTS.map((r, i) => (
              <tr key={r.sr}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{r.advt}</td>
                <td><a href="#">{r.exam}</a></td>
                <td>{r.declared}</td>
                <td>{r.cutoff}</td>
                <td><span className={`badge ${r.stage}`}>{r.stageLabel}</span></td>
                <td>{r.dl.map((d, j) => <span key={j}>{j > 0 && ' · '}<a href="#">{d}</a></span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="two-col" style={{ marginTop: 12 }}>
        <div className="box">
          <div className="box-title saffron"><span>Answer Keys</span><span className="guj">ઉત્તરકૂંચી</span></div>
          <div className="box-body" style={{ padding: 0 }}>
            <ul className="ojas">
              {ANSWER_KEYS.map((k, i) => <li key={i}><a href="#">{k}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="box">
          <div className="box-title"><span>Grievance / Representation</span><span className="guj">ફરિયાદ / રજૂઆત</span></div>
          <div className="box-body">
            <p>Candidates may file objections against any provisional answer key by paying a non-refundable fee of <strong>Rs. 100/-</strong> per question. Representations against final results may be filed online within <strong>15 days</strong> of declaration.</p>
            <p style={{ marginTop: 10 }}>For grievances, write to <a href="#">grievance.ud@gujarat.gov.in</a> or visit the Sachivalaya Help Desk between 11:00 — 17:00 (Mon — Fri).</p>
            <div style={{ marginTop: 12 }}>
              <button className="btn primary">File Representation</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
