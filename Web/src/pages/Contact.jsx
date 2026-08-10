const HQ_TABLE = [
  ['Telephone', <a href="tel:02766233232">02766 — 233232</a>],
  ['Email', <a href="mailto:np_patan@yahoo.co.in">np_patan@yahoo.co.in</a>],
  ['Office Hours', 'Mon — Sat, 10:30 — 18:10 (lunch 13:30 — 14:00)'],
  ['Public Holidays', 'As per Gujarat State Government calendar'],
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
  ['Chief Officer',               'Sushri Hiralben Thakkar'],
  ['Helpline Phone',              <a href="tel:02766233232">02766 — 233232</a>],
  ['Official Email',              <a href="mailto:np_patan@yahoo.co.in">np_patan@yahoo.co.in</a>],
  ['Recruitment & Helpdesk Cell', 'Patan Nagarpalika Recruitment Support'],
]

export default function Contact() {
  return (
    <>
      <div className="page-heading">
        <h1>Contact &amp; Help Desk</h1>
        <span className="guj">સંપર્ક અને સહાય ડેસ્ક</span>
      </div>

      <div className="two-col">
        <div>
          <div className="box">
            <div className="box-title"><span>Patan Nagarpalika Office</span><span className="guj">પાટણ નગરપાલિકા કચેરી</span></div>
            <div className="box-body">
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                <strong>Patan Nagarpalika</strong><br />
                Department of Urban Development &amp; Urban Housing<br />
                Bhadra Vistar, Dunawada Road, Patan — 384265,<br />
                Gujarat, India.<br />
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
        </div>

        <div>
          <div className="box">
            <div className="box-title saffron"><span>Help &amp; Queries / Officers</span><span className="guj">સહાય અને પ્રશ્નોત્તરી</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas regional-table">
                <tbody>
                  {PIO.map(([role, name]) => (
                    <tr key={role}>
                      <td>
                        <strong>{role}</strong>
                        <div style={{ fontSize: 13, color: 'var(--ojas-ink-2)', marginTop: 2 }}>{name}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <div className="title">EMERGENCY &amp; GRIEVANCES</div>
            For municipal civic emergencies or queries, contact Patan Nagarpalika helpline at <strong>02766-233232</strong>.
          </div>
        </div>
      </div>
    </>
  )
}
