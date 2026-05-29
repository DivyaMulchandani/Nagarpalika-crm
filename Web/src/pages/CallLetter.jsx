const ACTIVE = [
  { advt: 'UD/2026/04 (Prelim)',  detail: 'Exam: 28/06/2026',              badge: 'active', label: 'Live' },
  { advt: 'UD/2026/04-3 (Mains)', detail: 'Exam: 14/07/2026',              badge: 'new',    label: 'From 25/06' },
  { advt: 'UD/2025/14 (DV)',      detail: 'Verification: 22/05/2026',      badge: 'active', label: 'Live' },
  { advt: 'UD/2025/11 (DV)',      detail: 'Verification: 18/05/2026',      badge: 'urgent', label: 'Closing' },
]

const CENTRES = ['Ahmedabad — 28 centres', 'Surat — 18 centres', 'Vadodara — 12 centres', 'Rajkot — 10 centres', 'Gandhinagar — 6 centres', 'Bhavnagar — 5 centres', 'Junagadh — 4 centres', '+ 18 district headquarters']

const STEPS = [
  'Select the advertisement for which you have applied from the dropdown above.',
  'Enter your 10-digit Confirmation Number received at the time of submission.',
  'Enter your Date of Birth in DD/MM/YYYY format exactly as on your application.',
  'Enter the captcha shown on the screen and click "Download Call Letter".',
  'Take a clear printout on A4 paper. Photocopies and digital copies are not accepted at the centre.',
  'Affix a recent passport-size photograph in the designated box and sign in the presence of the invigilator.',
]

export default function CallLetter() {
  return (
    <>
      <div className="page-heading">
        <h1>Call Letter / Hall Ticket Download</h1>
        <span className="guj">પરીક્ષા હોલ ટિકિટ ડાઉનલોડ</span>
      </div>

      <div className="notice warn">
        <div className="title">IMPORTANT · મહત્વપૂર્ણ</div>
        Candidates are <strong>STRICTLY</strong> advised to bring the printed Call Letter, a valid photo identity proof (Aadhaar / PAN / Driving Licence / Passport), and two recent passport-size photographs to the examination centre. <strong>Entry without the call letter is not permitted.</strong>
        <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-guj)' }}>કોલ લેટર વગર પ્રવેશ આપવામાં આવશે નહીં.</span>
      </div>

      <div className="two-col">
        <div>
          <div className="box">
            <div className="box-title">
              <span>Download Your Call Letter</span>
              <span className="guj">તમારો કોલ લેટર ડાઉનલોડ કરો</span>
            </div>
            <div className="box-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Select Advertisement</label>
                  <select>
                    <option>UD/2026/04 — Town Planner / JE / Clerk (Prelim)</option>
                    <option>UD/2026/04-3 — Municipal Commissioner (Mains)</option>
                    <option>UD/2025/14 — Junior Engineer (Document Verification)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Confirmation Number / OTR ID</label>
                  <input type="text" placeholder="10-digit Confirmation Number" />
                </div>
                <div className="form-field">
                  <label>Date of Birth (DD/MM/YYYY)</label>
                  <input type="text" placeholder="DD/MM/YYYY" />
                </div>
                <div className="form-field">
                  <label>Captcha</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: 6, background: 'var(--ojas-cream)', padding: '6px 12px', border: '1px solid var(--ojas-line)', fontStyle: 'italic', textDecoration: 'line-through' }}>7K9X2P</span>
                    <input type="text" placeholder="Enter captcha" style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn primary">Download Call Letter</button>
                  <a href="#" style={{ marginLeft: 10 }}>Forgot Confirmation Number?</a>
                </div>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title">
              <span>How to Download — Step by Step</span>
              <span className="guj">ડાઉનલોડ કરવાની રીત</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <ol className="ojas">
                {STEPS.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          </div>
        </div>

        <div>
          <div className="box">
            <div className="box-title saffron"><span>Active Call Letters</span><span className="guj">સક્રિય કોલ લેટર</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas kv">
                <tbody>
                  {ACTIVE.map((a, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{a.advt}</strong>
                        <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>{a.detail}</div>
                      </td>
                      <td><span className={`badge ${a.badge}`}>{a.label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Examination Centres</span><span className="guj">પરીક્ષા કેન્દ્રો</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <ul className="ojas">
                {CENTRES.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <div className="title">REPORTING TIME · સમય</div>
            Candidates must report at least <strong>60 minutes before</strong> the scheduled examination. Late entry is <strong>strictly not permitted</strong>.
          </div>
        </div>
      </div>
    </>
  )
}
