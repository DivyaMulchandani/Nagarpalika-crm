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
              <input type="text" placeholder="e.g. ADV/2026/0001" />
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
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>
                No results published yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="two-col" style={{ marginTop: 12 }}>
        <div className="box">
          <div className="box-title saffron"><span>Answer Keys</span><span className="guj">ઉત્તરકૂંચી</span></div>
          <div className="box-body" style={{ padding: 0 }}>
            <ul className="ojas">
              <li style={{ padding: '16px', color: 'var(--ojas-ink-3)', fontStyle: 'italic' }}>No answer keys published yet.</li>
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
