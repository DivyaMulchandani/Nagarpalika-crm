import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function Footer() {
  const { t } = useLang()
  return (
    <div className="footer">
      <div className="footer-grid">
        <div>
          <h4>{t('ft.brand')}</h4>
          <div>{t('ft.about')}</div>
          <div style={{ marginTop: 8 }}>
            Sardar Bhavan, Block 14, 9th Floor, Sachivalaya, Gandhinagar — 382010.
          </div>
        </div>
        <div>
          <h4>{t('ft.ql')}</h4>
          <Link to="/">Home</Link>
          <Link to="/careers">Careers</Link>
          <a href="#">Help Manual</a>
          <a href="#">RTI Portal</a>
        </div>
        <div>
          <h4>{t('ft.help')}</h4>
          <div>079-2325-XXXX</div>
          <div>helpdesk-ud@gujarat.gov.in</div>
          <div>10:30 – 18:10 (Mon–Fri)</div>
        </div>
      </div>
      <div className="footer-bottom">{t('ft.copy')}</div>
    </div>
  )
}
