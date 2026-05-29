const ORG = [
  { sr: 1, wing: 'Secretariat — Urban Development',               head: 'Principal Secretary',     hq: 'Sachivalaya, Gandhinagar' },
  { sr: 2, wing: 'Directorate of Municipalities',                  head: 'Director (IAS)',           hq: 'Gandhinagar' },
  { sr: 3, wing: 'Town Planning & Valuation Dept.',                head: 'Chief Town Planner',       hq: 'Gandhinagar' },
  { sr: 4, wing: 'Ahmedabad Urban Development Authority (AUDA)',   head: 'Chief Executive Authority',hq: 'Usmanpura, Ahmedabad' },
  { sr: 5, wing: 'Surat Urban Development Authority (SUDA)',       head: 'Chief Executive Authority',hq: 'Athwa, Surat' },
  { sr: 6, wing: 'Vadodara Urban Development Authority (VUDA)',    head: 'Chief Executive Authority',hq: 'Akota, Vadodara' },
  { sr: 7, wing: 'Rajkot Urban Development Authority (RUDA)',      head: 'Chief Executive Authority',hq: 'Rajkot' },
  { sr: 8, wing: 'Gandhinagar Urban Development Authority (GUDA)', head: 'Chief Executive Authority',hq: 'Sector 16, Gandhinagar' },
  { sr: 9, wing: 'Gujarat Municipal Finance Board',                head: 'Member Secretary',         hq: 'Gandhinagar' },
  { sr:10, wing: 'Gujarat Urban Development Mission',              head: 'Mission Director',         hq: 'Gandhinagar' },
]

const GLANCE = [
  ['Established', <strong>1972</strong>],
  ['Cadre Strength', '4,820 officers'],
  ['Municipal Corpns.', '8'],
  ['Municipalities', '156'],
  ['UDAs', '6'],
  ['Annual Outlay (FY26)', 'Rs. 23,540 Cr.'],
  ['Smart Cities', '6'],
  ['Metro Networks', '2 Operational'],
]

const LEADERSHIP = [
  ['Hon\'ble Minister',          'Smt. Vijaybhai Rupani'],
  ['Hon\'ble Minister of State', 'Shri Praful Pansheriya'],
  ['Principal Secretary',        'Shri M. Thennarasan, IAS'],
  ['Director (Municipalities)',  'Shri R. K. Mehta, IAS'],
  ['Chief Town Planner',         'Shri H. P. Patel'],
]

export default function About() {
  return (
    <>
      <div className="page-heading">
        <h1>About the Department of Urban Development &amp; Urban Housing</h1>
        <span className="guj">શહેરી વિકાસ અને શહેરી આવાસ વિભાગ વિશે</span>
      </div>

      <div className="two-col">
        <div>
          <div className="box">
            <div className="box-title"><span>Mandate</span><span className="guj">આદેશ</span></div>
            <div className="box-body">
              <p>The Department of Urban Development &amp; Urban Housing is the nodal agency of the Government of Gujarat for planning, governance and service delivery in the State's urban areas. It oversees 8 Municipal Corporations, 156 Municipalities, 6 Urban Development Authorities, and the Directorate of Municipalities.</p>
              <p style={{ marginTop: 10 }}>The Department's mandate covers town planning, building permissions, water supply &amp; sewerage, solid waste management, slum rehabilitation, affordable housing, urban transport (Metro &amp; BRTS), and the Smart Cities Mission.</p>
              <p style={{ marginTop: 10, fontFamily: 'var(--font-guj)', fontSize: 13 }}>આ વિભાગ રાજ્યના શહેરી વિસ્તારોમાં આયોજન, શાસન અને સેવા વિતરણ માટે ગુજરાત સરકારની નોડલ એજન્સી છે.</p>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Organisational Structure</span><span className="guj">સંગઠનાત્મક માળખું</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>Sr.</th>
                    <th>Wing / Authority</th>
                    <th style={{ width: 170 }}>Headed By</th>
                    <th style={{ width: 140 }}>Headquarters</th>
                  </tr>
                </thead>
                <tbody>
                  {ORG.map(o => (
                    <tr key={o.sr}><td>{o.sr}</td><td>{o.wing}</td><td>{o.head}</td><td>{o.hq}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Key Functions</span><span className="guj">મુખ્ય કાર્યો</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <ul className="ojas">
                <li>Preparation, approval and revision of Development Plans &amp; Town Planning Schemes</li>
                <li>Sanction of Building Permissions through the Building Plan Management System (BPMS)</li>
                <li>Implementation of Pradhan Mantri Awas Yojana (Urban) and Mukhyamantri Awas Yojana</li>
                <li>Operation &amp; maintenance of Metro Rail (Ahmedabad, Surat) and BRTS networks</li>
                <li>Solid waste management and waste-to-energy projects</li>
                <li>AMRUT 2.0 — water supply, sewerage &amp; storm-water drainage</li>
                <li>Smart Cities Mission across 6 selected cities</li>
                <li>Recruitment, training and cadre management of municipal officers</li>
              </ul>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>History</span><span className="guj">ઇતિહાસ</span></div>
            <div className="box-body">
              <p>The Department was constituted in <strong>1972</strong> following the enactment of the Gujarat Town Planning &amp; Urban Development Act, 1976. Over five decades, the Department has supervised the urbanisation of Gujarat from 28% (1971 census) to over 47% (2025 estimate), making Gujarat one of India's most urbanised states.</p>
              <p style={{ marginTop: 10 }}>Since 2014, the Department has anchored Gujarat's selection of 6 cities under the Smart Cities Mission and the operationalisation of the Ahmedabad Metro (Phase I, 2022) and Surat Metro (Phase I, 2024).</p>
            </div>
          </div>
        </div>

        <div>
          <div className="box">
            <div className="box-title saffron"><span>At a Glance</span><span className="guj">સંક્ષિપ્તમાં</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas kv">
                <tbody>
                  {GLANCE.map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title"><span>Leadership</span><span className="guj">નેતૃત્વ</span></div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas">
                <tbody>
                  {LEADERSHIP.map(([role, name]) => (
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
            <div className="title">VISION · ભાવિ દૃષ્ટિ</div>
            To make every city in Gujarat liveable, inclusive, and economically vibrant by 2035 — with universal access to water, sanitation, housing and dignified mobility.
          </div>
        </div>
      </div>
    </>
  )
}
