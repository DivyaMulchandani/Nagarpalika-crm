import { useState } from 'react'
import { post } from '../api/index'

const HQ_TABLE = [
  ['Telephone', '079 — 2325 1501 / 02 / 03'],
  ['Fax', '079 — 2325 1521'],
  ['Email (General)', <a href="mailto:secy-ud@gujarat.gov.in">secy-ud@gujarat.gov.in</a>],
  ['Email (Recruitment)', <a href="mailto:recruitment.ud@gujarat.gov.in">recruitment.ud@gujarat.gov.in</a>],
  ['OJAS Helpdesk', '1800 233 5500 (Toll Free, 09:00 — 18:00)'],
  ['Office Hours', 'Mon — Fri, 10:30 — 18:10 (lunch 13:30 — 14:00)'],
  ['Public Holidays', 'As per State Government calendar'],
]

const REGIONAL = [
  { name: 'AUDA', city: 'Ahmedabad',  sub: 'Usmanpura, Opp. AEC', phone: '079 — 2755 4321' },
  { name: 'SUDA', city: 'Surat',      sub: 'Athwa Lines',          phone: '0261 — 245 1100' },
  { name: 'VUDA', city: 'Vadodara',   sub: 'Akota Stadium Road',   phone: '0265 — 235 8821' },
  { name: 'RUDA', city: 'Rajkot',     sub: 'Race Course Road',     phone: '0281 — 247 6011' },
  { name: 'GUDA', city: 'Gandhinagar',sub: 'Sector 16',            phone: '079 — 2325 6700' },
  { name: 'BUDA', city: 'Bhavnagar',  sub: 'Kalanala',             phone: '0278 — 251 4400' },
]

const PIO = [
  ['State PIO',                   'Shri D. K. Solanki, Dy. Secretary'],
  ['First Appellate Authority',   'Shri M. Thennarasan, IAS — Principal Secretary'],
  ['Nodal Officer (Recruitment)', 'Smt. R. Joshi, Under Secretary'],
  ['OJAS Technical Coordinator',  'NIC Gujarat State Centre'],
]

const EMPTY = { name: '', mobile: '', email: '', category: 'General Query', subject: '', message: '' }

export default function Contact() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setError('Full Name and Message are required.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await post('/api/v1/help/query', form)
      setSuccess(true)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => { setForm(EMPTY); setError(null); setSuccess(false) }

  return (
    <>
      <div className="page-heading">
        <h1>Contact Us</h1>
        <span className="guj">સંપર્ક કરો</span>
      </div>

      <div className="two-col">
        <div>
          <div className="box">
            <div className="box-title"><span>Department Headquarters</span><span className="guj">વિભાગ મુખ્યાલય</span></div>
            <div className="box-body">
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                <strong>Department of Urban Development &amp; Urban Housing</strong><br />
                Sardar Bhavan, Block No. 14, 9th Floor,<br />
                Sachivalaya, Gandhinagar — 382010,<br />
                Gujarat, India.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--ojas-line)', margin: '14px 0' }} />
              <table className="ojas kv">
                <tbody>
                  {HQ_TABLE.map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Send a Grievance / Query</span><span className="guj">ફરિયાદ / પ્રશ્ન મોકલો</span></div>
            <div className="box-body">
              {success ? (
                <div className="notice success">
                  <div className="title">Query Submitted</div>
                  Your query has been received. We will respond shortly.
                  <div style={{ marginTop: 10 }}>
                    <button className="btn ghost" onClick={handleReset}>Submit Another</button>
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-field-row">
                    <div className="form-field">
                      <label>Full Name *</label>
                      <input type="text" placeholder="As per official ID" value={form.name} onChange={set('name')} />
                    </div>
                    <div className="form-field">
                      <label>Mobile Number</label>
                      <input type="tel" placeholder="10-digit" maxLength={10} value={form.mobile} onChange={set('mobile')} />
                    </div>
                  </div>
                  <div className="form-field-row">
                    <div className="form-field">
                      <label>Email Address</label>
                      <input type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
                    </div>
                    <div className="form-field">
                      <label>Category</label>
                      <select value={form.category} onChange={set('category')}>
                        <option>General Query</option>
                        <option>Recruitment / OJAS</option>
                        <option>Building Permission</option>
                        <option>Property Tax</option>
                        <option>Public Grievance</option>
                        <option>RTI Query</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Subject</label>
                    <input type="text" placeholder="Brief subject line" value={form.subject} onChange={set('subject')} />
                  </div>
                  <div className="form-field">
                    <label>Message / Details *</label>
                    <textarea rows={5} placeholder="Please provide all relevant details, dates, reference numbers..." value={form.message} onChange={set('message')} />
                  </div>
                  {error && <p style={{ color: 'var(--ojas-red)', fontSize: 13, margin: '4px 0' }}>{error}</p>}
                  <div className="form-actions">
                    <button className="btn primary" onClick={handleSubmit} disabled={loading}>
                      {loading ? 'Submitting…' : 'Submit'}
                    </button>
                    <button className="btn ghost" onClick={handleReset} disabled={loading}>Reset</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="box">
            <div className="box-title saffron"><span>Regional Offices</span><span className="guj">પ્રાદેશિક કચેરીઓ</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas">
                <thead><tr><th>Office</th><th style={{ width: 140 }}>Phone</th></tr></thead>
                <tbody>
                  {REGIONAL.map(r => (
                    <tr key={r.name}>
                      <td>
                        <strong>{r.name}</strong> — {r.city}
                        <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>{r.sub}</div>
                      </td>
                      <td>{r.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Public Information Officers</span><span className="guj">જાહેર માહિતી અધિકારી</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas">
                <tbody>
                  {PIO.map(([role, name]) => (
                    <tr key={role}>
                      <td>
                        <strong>{role}</strong>
                        <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>{name}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <div className="title">EMERGENCY · ઇમરજન્સી</div>
            For municipal civic emergencies dial <strong>1800 233 1080</strong> · For state-wide grievance, file at SWAGAT — <strong>swagat.gujarat.gov.in</strong>
          </div>
        </div>
      </div>
    </>
  )
}
