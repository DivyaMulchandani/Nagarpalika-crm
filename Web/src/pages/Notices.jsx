import { useState } from 'react'

const ALL_NOTICES = [
  { sr: 1,  date: '07/05/2026', ref: 'UD/NOT/2026/47',  subject: 'Public hearing on Ahmedabad Master Plan 2041 — second draft',                                   type: 'notice', typeLabel: 'Notice' },
  { sr: 2,  date: '04/05/2026', ref: 'UD/PR/2026/19',   subject: "Foundation stone of Surat Metro Phase II laid by Hon'ble Chief Minister",                        type: 'press',  typeLabel: 'Press' },
  { sr: 3,  date: '02/05/2026', ref: 'UD/CIR/2026/31',  subject: 'Revised guidelines for issuance of Building Use (BU) permission — applicable from 01/06/2026',   type: 'notice', typeLabel: 'Circular' },
  { sr: 4,  date: '28/04/2026', ref: 'UD/2026/04',      subject: 'Recruitment Notification — Town Planner, Junior Engineer & Clerk-cum-Typist (142 posts)',         type: 'recruit',typeLabel: 'Recruit' },
  { sr: 5,  date: '22/04/2026', ref: 'AMC/TND/2026/08', subject: 'Tender for solid-waste-to-energy plant at Pirana, Ahmedabad — pre-bid 12/05/2026',                type: 'tender', typeLabel: 'Tender' },
  { sr: 6,  date: '18/04/2026', ref: 'UD/CIR/2026/30',  subject: 'Implementation of unified property tax assessment formula across Class A & B Municipalities',     type: 'notice', typeLabel: 'Circular' },
  { sr: 7,  date: '15/04/2026', ref: 'UD/NOT/2026/45',  subject: 'Janata Darbar — public grievance hearing rescheduled to 18/05/2026',                              type: 'notice', typeLabel: 'Notice' },
  { sr: 8,  date: '10/04/2026', ref: 'SUDA/TND/2026/04',subject: 'Tender for development of Sarthana–Khajod Metro corridor stations (Phase II)',                    type: 'tender', typeLabel: 'Tender' },
  { sr: 9,  date: '05/04/2026', ref: 'UD/PR/2026/17',   subject: 'AMRUT 2.0 — Gujarat ranks first nationally in 24×7 water supply coverage',                        type: 'press',  typeLabel: 'Press' },
  { sr: 10, date: '01/04/2026', ref: 'UD/CIR/2026/29',  subject: 'Allocation of FY 2026-27 budget to Urban Local Bodies — district-wise breakdown',                  type: 'notice', typeLabel: 'Circular' },
  { sr: 11, date: '26/03/2026', ref: 'VUDA/TND/2026/02',subject: 'Tender for redevelopment of Old Padra Road as a model Smart Street, Vadodara',                    type: 'tender', typeLabel: 'Tender' },
  { sr: 12, date: '20/03/2026', ref: 'UD/NOT/2026/42',  subject: 'Notice inviting objections — Town Planning Scheme No. 442, Vastrapur (Final)',                    type: 'notice', typeLabel: 'Notice' },
]

const TYPE_FILTERS = [
  { k: 'all',    l: 'All',          count: ALL_NOTICES.length },
  { k: 'notice', l: 'Notice',       count: ALL_NOTICES.filter(n => n.type === 'notice').length },
  { k: 'notice', l: 'Circular',     count: ALL_NOTICES.filter(n => n.typeLabel === 'Circular').length },
  { k: 'tender', l: 'Tender',       count: ALL_NOTICES.filter(n => n.type === 'tender').length },
  { k: 'press',  l: 'Press Release',count: ALL_NOTICES.filter(n => n.type === 'press').length },
]

export default function Notices() {
  const [filter, setFilter] = useState('all')

  const visible = filter === 'all'
    ? ALL_NOTICES
    : ALL_NOTICES.filter(n => n.type === filter)

  return (
    <>
      <div className="page-heading">
        <h1>Notices, Circulars &amp; Public Communications</h1>
        <span className="guj">સૂચનાઓ, પરિપત્રો અને જાહેર સંદેશાઓ</span>
      </div>

      <div className="filter-row">
        <span className="label">Filter by Type</span>
        {TYPE_FILTERS.map((f, i) => (
          <button
            key={i}
            className={`chip${filter === f.k && (f.k !== 'all' || filter === 'all') ? ' active' : ''}`}
            onClick={() => setFilter(f.k)}
          >
            {f.l} <span className="count">({f.count})</span>
          </button>
        ))}
      </div>

      <div className="box">
        <div className="box-title">
          <span>Recent Notices &amp; Circulars</span>
          <span className="guj">તાજેતરની સૂચનાઓ</span>
        </div>
        <table className="ojas">
          <thead>
            <tr>
              <th style={{ width: 36 }}>Sr.</th>
              <th style={{ width: 110 }}>Date</th>
              <th style={{ width: 130 }}>Reference No.</th>
              <th>Subject</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 80 }}>File</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((n, i) => (
              <tr key={n.sr}>
                <td>{i + 1}</td>
                <td>{n.date}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{n.ref}</td>
                <td><a href="#">{n.subject}</a></td>
                <td><span className={`tag ${n.type}`}>{n.typeLabel}</span></td>
                <td><a href="#">PDF ▶</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <a className="active">1</a>
        <a>2</a>
        <a>3</a>
        <a>Next ▶</a>
      </div>
    </>
  )
}
