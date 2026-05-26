import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { get } from '../api/index'

const FACTS = [
  { n: '142', l: 'Open Posts' },
  { n: '10', l: 'Active Advts.' },
  { n: '22/05', l: 'Next Last Date' },
  { n: '33', l: 'Districts Covered' },
]

const SERVICES = [
  { title: 'Mukhyamantri Awas Yojana (Urban)', sub: 'Affordable housing for EWS & LIG households · મુખ્યમંત્રી શહેરી આવાસ યોજના', dept: 'Urban Housing Cell', badge: 'active', badgeLabel: 'Active', action: 'Apply ▶' },
  { title: 'Property Tax Self-Assessment', sub: 'Online assessment, payment & receipt · મિલકત વેરો', dept: 'Municipal Corporations', badge: 'active', badgeLabel: 'Online', action: 'Pay ▶' },
  { title: 'Building Plan Approval (BPMS)', sub: 'Online sanctioning of building permissions · બાંધકામ મંજૂરી', dept: 'Town Planning Office', badge: 'active', badgeLabel: 'Online', action: 'Submit ▶' },
  { title: 'Birth & Death Registration', sub: 'e-Nagar portal certificate issue · જન્મ-મરણ નોંધણી', dept: 'e-Nagar / ULBs', badge: 'active', badgeLabel: 'Online', action: 'Apply ▶' },
  { title: 'Public Grievance Redressal (SWAGAT)', sub: 'State-wide Attention on Grievances · જાહેર ફરિયાદ નિવારણ', dept: 'Sachivalaya, Gandhinagar', badge: 'new', badgeLabel: '24×7', action: 'File ▶' },
  { title: 'Smart City Mission — Project Tracker', sub: 'Ahmedabad, Surat, Vadodara, Rajkot, Gandhinagar & Dahod · સ્માર્ટ સિટી', dept: 'Urban Development', badge: 'info', badgeLabel: 'View', action: 'Open ▶' },
  { title: 'RTI & Public Records', sub: 'Right to Information request & first-appeal · માહિતી અધિકાર', dept: 'State Public Information Officer', badge: 'active', badgeLabel: 'Online', action: 'Apply ▶' },
]

const NEWS = [
  { day: '07', mo: 'May 2026', tag: 'notice', tagLabel: 'Notice', h: 'Public hearing on Ahmedabad Master Plan 2041 — second draft', p: 'Citizens, RWAs and trade bodies are invited to submit objections and suggestions on the revised draft by 30/05/2026 at the AUDA office, Usmanpura.', href: '#' },
  { day: '04', mo: 'May 2026', tag: 'press',  tagLabel: 'Press',  h: 'Foundation stone laid for Surat Metro Phase II', p: 'The 14.4 km extension will connect Sarthana to the Diamond Bourse at Khajod, with twelve new stations and an estimated completion in 2029.', href: '#' },
  { day: '28', mo: 'Apr 2026', tag: 'recruit',tagLabel: 'Recruit',h: 'Advt. UD/2026/04 — Town Planner, Junior Engineer & Clerk-cum-Typist', p: 'Applications invited for 142 posts across municipal corporations and urban development authorities. Last date 22/05/2026 through OJAS.', href: '/careers', router: true },
  { day: '22', mo: 'Apr 2026', tag: 'tender', tagLabel: 'Tender', h: 'Tender for solid-waste-to-energy plant at Pirana — pre-bid meeting', p: 'Pre-bid meeting scheduled at AMC Headquarters on 12/05/2026. Tender document and EMD details available on the State e-Procurement portal.', href: '#' },
  { day: '15', mo: 'Apr 2026', tag: 'notice', tagLabel: 'Notice', h: 'Janata Darbar — public grievance hearing rescheduled to 18/05/2026', p: 'The fortnightly Janata Darbar at the Sachivalaya, Block 14, Ground Floor will be held on the third Monday of the month due to administrative reasons.', href: '#' },
]

const VM_ITEMS = [
  { tag: 'new',    bold: 'Advt. UD/2026/04',    rest: ' — Town Planner, JE & Clerk-cum-Typist · 142 posts · Last date 22/05/2026' },
  { tag: 'urgent', bold: 'Advt. UD/2026/04-3',  rest: ' — Municipal Commissioner (Class A) · Last date 15/05/2026' },
  { tag: 'new',    bold: 'Advt. UD/2026/04-10', rest: ' — Data Entry Operator (Contract) · e-Nagar Cell · 18/05/2026' },
  { tag: 'rel',    bold: null, rest: 'OJAS portal v3.2 — improved photo & signature upload · Live since 02/05/2026' },
  { tag: 'rel',    bold: null, rest: 'Call letters published for Advt. UD/2025/14 · Download from Candidate Portal' },
  { tag: 'rel',    bold: null, rest: 'Final Answer Key — Advt. UD/2025/11 (Junior Engineer) · Available now' },
  { tag: 'rel',    bold: null, rest: 'Result declared — Advt. UD/2025/09 (Surveyor) · Cut-off 78.5' },
  { tag: 'urgent', bold: 'Advt. UD/2026/04-6',  rest: ' — Asst. Inspector, Building Permissions · Last date 20/05/2026' },
  { tag: 'new',    bold: null, rest: 'Mukhyamantri Awas Yojana (Urban) — applications reopened · Online via e-Nagar' },
  { tag: 'rel',    bold: null, rest: 'OTR (One Time Registration) reset facility now available · Help Manual updated' },
]

const VM_TAG_LABELS = { new: 'NEW', urgent: 'URGENT', rel: 'RELEASE' }

function VmList({ ariaHidden, items }) {
  const list = items?.length ? items : VM_ITEMS
  return (
    <ul className="vm-list" aria-hidden={ariaHidden || undefined}>
      {list.map((item, i) => (
        <li key={i}>
          <span className={`vm-tag ${item.tag}`}>{VM_TAG_LABELS[item.tag]}</span>
          <span>{item.bold && <strong>{item.bold}</strong>}{item.rest}</span>
        </li>
      ))}
    </ul>
  )
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export default function Home() {
  const { t } = useLang()
  const [liveItems, setLiveItems] = useState([])

  useEffect(() => {
    get('/api/v1/advertisements', { status: 'Published', limit: 10 })
      .then(res => {
        const ads = res?.data || []
        setLiveItems(ads.map(a => ({
          tag: 'new',
          bold: a.advt_no,
          rest: ` — ${a.post_title?.en || ''}${a.end_date ? ' · Last date ' + fmtDate(a.end_date) : ''}`,
        })))
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="hero-strip">
        <div className="eyebrow">{t('home.welcome.eyebrow')}</div>
        <h1>{t('home.welcome.h')}</h1>
        <div className="guj">{t('home.welcome.guj')}</div>
      </div>

      <div className="fact-strip">
        {FACTS.map(f => (
          <div key={f.l} className="fact">
            <div className="n">{f.n}</div>
            <div className="l">{f.l}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div>
          {/* Citizen Services */}
          <div className="box">
            <div className="box-title">
              <span>{t('home.svc.title')}</span>
              <span className="guj">{t('home.svc.guj')}</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <table className="ojas">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>Sr.</th>
                    <th>Service / Scheme</th>
                    <th style={{ width: 160 }}>Department / Authority</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 90 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SERVICES.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <a href="#">{s.title}</a>
                        <div style={{ fontSize: 11, color: 'var(--ojas-ink-3)', marginTop: 2 }}>{s.sub}</div>
                      </td>
                      <td>{s.dept}</td>
                      <td><span className={`badge ${s.badge}`}>{s.badgeLabel}</span></td>
                      <td><a href="#" style={{ color: 'var(--ojas-saffron-deep)', fontWeight: 700 }}>{s.action}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* News */}
          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title">
              <span>{t('home.news.title')}</span>
              <span className="guj">{t('home.news.guj')}</span>
            </div>
            <div className="box-body">
              <ul className="news-list">
                {NEWS.map((n, i) => (
                  <li key={i}>
                    <div className="news-date">
                      <span className="news-day">{n.day}</span>
                      <span className="news-mo">{n.mo}</span>
                    </div>
                    <div className="news-body">
                      <h3>
                        <span className={`tag ${n.tag}`}>{n.tagLabel}</span>
                        {n.h}
                      </h3>
                      <p>{n.p}</p>
                      {n.router
                        ? <Link to={n.href}>View open positions ▶</Link>
                        : <a href={n.href}>Read full notice ▶</a>
                      }
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className="box">
            <div className="box-title saffron">
              <span>{t('home.up.title')}</span>
              <span className="guj">{t('home.up.guj')}</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <div className="vmarquee" aria-label="Latest releases marquee">
                <div className="vmarquee-track">
                  <VmList items={liveItems} />
                  {liveItems.length >= 4 && <VmList items={liveItems} ariaHidden />}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ojas-border)', padding: '8px 12px', textAlign: 'right', background: 'var(--ojas-cream)' }}>
                <Link to="/careers" style={{ fontWeight: 700 }}>View all advertisements ▶</Link>
              </div>
            </div>
          </div>

          <div className="box" style={{ marginTop: 12 }}>
            <div className="box-title">
              <span>{t('home.ql.title')}</span>
              <span className="guj">{t('home.ql.guj')}</span>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <ul className="ojas">
                <li><Link to="/careers">Apply Online — Advt. UD/2026/04</Link></li>
                <li><a href="#">Know Confirmation Number</a></li>
                <li><a href="#">Forgot Password?</a></li>
                <li><Link to="/callletter">Call Letter Download</Link></li>
                <li><a href="#">Answer Key</a></li>
                <li><Link to="/results">Result</Link></li>
                <li><a href="#">RTI Portal</a></li>
                <li><a href="#">Help Manual (PDF)</a></li>
              </ul>
            </div>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <div className="title">NOTE · નોંધ</div>
            Candidates are advised to read the advertisement carefully before applying online.{' '}
            <span style={{ fontFamily: 'var(--font-guj)' }}>ઓનલાઇન અરજી કરતાં પહેલાં જાહેરાત કાળજીપૂર્વક વાંચવી.</span>
          </div>
        </div>
      </div>
    </>
  )
}
