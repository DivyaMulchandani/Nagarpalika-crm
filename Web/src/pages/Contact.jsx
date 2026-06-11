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

export default function Contact() {
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
            <div className="box-title"><span>Public Information Officers</span><span className="guj">જાહેર માહિતી અધિકારી</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas regional-table">
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
        </div>

        <div>
          <div className="box">
            <div className="box-title saffron"><span>Regional Offices</span><span className="guj">પ્રાદેશિક કચેરીઓ</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas regional-table">
                <thead><tr><th>Office</th><th>Phone</th></tr></thead>
                <tbody>
                  {REGIONAL.map(r => (
                    <tr key={r.name}>
                      <td>
                        <strong>{r.name}</strong> — {r.city}
                        <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)' }}>{r.sub}</div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{r.phone}</td>
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
