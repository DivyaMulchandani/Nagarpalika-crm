import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function Footer() {
  const { t } = useLang()
  return (
    <div className="footer">
      <div className="footer-grid">
        <div>
          <h4>Patan Nagarpalika</h4>
          <div>Department of Urban Development &amp; Urban Housing</div>
          <div style={{ marginTop: 8, lineHeight: 1.5, fontSize: 13 }}>
            Bhadra Vistar, Dunawada Road, Patan, Gujarat 384265
          </div>
        </div>
        <div>
          <h4>{t('ft.ql')}</h4>
          <Link to="/">Home</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/notices">Notices</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <h4>{t('ft.help')}</h4>
          <div style={{ marginBottom: 4 }}>
            Phone: <a href="tel:02766233232" style={{ color: 'inherit', textDecoration: 'none' }}>02766-233232</a>
          </div>
          <div style={{ marginBottom: 4 }}>
            Email: <a href="mailto:np_patan@yahoo.co.in" style={{ color: 'inherit', textDecoration: 'none' }}>np_patan@yahoo.co.in</a>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ojas-ink-3)' }}>10:30 – 18:10 (Mon–Sat)</div>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Patan Nagarpalika | Recruitment Portal</div>
    </div>
  )
}
