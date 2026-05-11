import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import SiteMarquee from './SiteMarquee'

const NAV = [
  { path: '/',           key: 'nav.home',       fallback: 'HOME' },
  { path: '/about',      key: 'nav.about',      fallback: 'ABOUT' },
  { path: '/careers',    key: 'nav.careers',    fallback: 'CAREERS / ભરતી' },
  { path: '/notices',    key: 'nav.notices',    fallback: 'NOTICES' },
  { path: '/results',    key: 'nav.results',    fallback: 'RESULT' },
  { path: '/callletter', key: 'nav.callletter', fallback: 'CALL LETTER' },
  { path: '/contact',    key: 'nav.contact',    fallback: 'CONTACT' },
]

export default function Header() {
  const { lang, setLang, t } = useLang()
  const { pathname } = useLocation()

  return (
    <>
      <div className="tricolor">
        <span className="saffron" />
        <span className="white" />
        <span className="green" />
      </div>

      <div className="brand-bar">
        <img src="/assets/gov-gujarat-emblem.svg" alt="Government of Gujarat emblem" />
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div className="brand-title">{t('brand.title')}</div>
          <div className="brand-sub">
            <span>{t('brand.sub')}</span>
            {' · '}
            <span className="guj">ગુજરાત સરકાર · શહેરી વિકાસ વિભાગ</span>
          </div>
        </div>
        <div className="brand-utility">
          <a href="#main">{t('util.skip')}</a>
          <span className="sep">|</span>
          <a href="#">{t('util.screen')}</a>
          <span className="sep">|</span>
          <a href="#">{t('util.az')}</a>
          <span className="sep">|</span>
          <div className="lang-toggle" role="group" aria-label="Language">
            {[['en', 'EN'], ['hi', 'हिं'], ['gu', 'ગુ']].map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={lang === code ? 'active' : ''}
                onClick={() => setLang(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="nav-row">
        {NAV.map(({ path, key, fallback }) => (
          <Link
            key={path}
            to={path}
            className={pathname === path ? 'active' : ''}
          >
            {t(key) || fallback}
          </Link>
        ))}
      </nav>

      <SiteMarquee />
    </>
  )
}
