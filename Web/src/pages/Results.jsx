import { Link } from 'react-router-dom'

export default function Results() {
  return (
    <>
      <div className="page-heading">
        <h1>Examination Results &amp; Answer Keys</h1>
        <span className="guj">પરીક્ષા પરિણામ અને ઉત્તરકૂંચી</span>
      </div>

      <div className="notice warn">
        <div className="title">RESULTS AVAILABILITY NOTICE · પરિણામ ઉપલબ્ધતા સૂચના</div>
        Examination results, merit lists, and answer keys are currently not declared. Results will be made available for search and download here once the examination process is completed and officially declared by Patan Nagarpalika. Please check the{' '}
        <Link to="/notices" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>
          Notices section
        </Link>{' '}
        regularly for announcements.
        <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-guj)' }}>
          પરીક્ષાના પરિણામો અને આન્સર-કી સત્તાવાર રીતે જાહેર થયા બાદ અહીંથી જોઈ અને ડાઉનલોડ કરી શકાશે.
        </span>
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
              <input type="text" placeholder="e.g. ADV/2026/0001" disabled />
            </div>
            <div className="form-field">
              <label>Confirmation Number / Registration ID</label>
              <input type="text" placeholder="e.g. OTR2026001234" disabled />
            </div>
            <div className="form-field">
              <label>Date of Birth (DD/MM/YYYY)</label>
              <input type="text" placeholder="DD/MM/YYYY" disabled />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn"
                disabled={true}
                style={{
                  background: 'var(--ojas-ink-4, #94a3b8)',
                  color: '#ffffff',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                }}
                title="Results will be enabled once officially declared."
              >
                View Result (Currently Unavailable)
              </button>
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
                No results published yet. Check back after exams are conducted.
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
            <p>Candidates may file objections against any provisional answer key or result within <strong>15 days</strong> of official declaration.</p>
            <p style={{ marginTop: 10 }}>For grievances, write to <a href="mailto:np_patan@yahoo.co.in">np_patan@yahoo.co.in</a> or visit Patan Nagarpalika Help Desk (02766-233232) during office hours (Mon — Sat).</p>
          </div>
        </div>
      </div>
    </>
  )
}
