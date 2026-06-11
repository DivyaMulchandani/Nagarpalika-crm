import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import SiteMarquee from './SiteMarquee'

const NAV = [
  { path: '/',                  key: 'nav.home',         fallback: 'HOME' },
  { path: '/careers',           key: 'nav.careers',      fallback: 'CAREERS / ભરતી' },
  { path: '/registration',      key: 'nav.registration', fallback: 'REGISTRATION' },
  { path: '/callletter',        key: 'nav.callletter',   fallback: 'CALL LETTER' },
  { path: '/contact',           key: 'nav.contact',      fallback: 'CONTACT' },
]

// ── Font size controls (A− / A / A+), persisted in localStorage ──────────────
const FONT_SCALE_KEY = 'ojas-font-scale'
const FONT_MIN = 0.85
const FONT_MAX = 1.3
const FONT_STEP = 0.1

function readFontScale() {
  try {
    const v = parseFloat(localStorage.getItem(FONT_SCALE_KEY))
    if (!Number.isNaN(v) && v >= FONT_MIN && v <= FONT_MAX) return v
  } catch { /* localStorage unavailable */ }
  return 1
}

function applyFontScale(scale) {
  // zoom scales the px-based OJAS stylesheet uniformly
  document.body.style.zoom = scale === 1 ? '' : String(scale)
}

function FontSizeControls() {
  const [scale, setScale] = useState(readFontScale)

  useEffect(() => {
    applyFontScale(scale)
    try { localStorage.setItem(FONT_SCALE_KEY, String(scale)) } catch { /* ignore */ }
  }, [scale])

  const step = (dir) =>
    setScale((s) => Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round((s + dir * FONT_STEP) * 100) / 100)))

  return (
    <div className="font-controls" role="group" aria-label="Font size">
      <button type="button" onClick={() => step(-1)} disabled={scale <= FONT_MIN} title="Decrease font size" aria-label="Decrease font size">A−</button>
      <button type="button" onClick={() => setScale(1)} title="Reset font size" aria-label="Reset font size">A</button>
      <button type="button" onClick={() => step(1)} disabled={scale >= FONT_MAX} title="Increase font size" aria-label="Increase font size">A+</button>
    </div>
  )
}

export default function Header() {
  const { lang, setLang, t } = useLang()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

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
          <FontSizeControls />
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
        {NAV.filter(({ path }) => !(user && path === '/registration')).map(({ path, key, fallback }) => {
          const isActive = path === '/'
            ? pathname === '/'
            : pathname.startsWith(path) &&
              !NAV.some(other => other.path !== path && other.path.startsWith(path) && pathname.startsWith(other.path))
          return (
            <Link
              key={path}
              to={path}
              className={isActive ? 'active' : undefined}
            >
              {t(key) || fallback}
            </Link>
          )
        })}
        {user ? (
          <span className="nav-user">
            <Link to="/application" className="nav-login-pill" title="My applications">
              {user.name ? user.name.split(' ')[0] : user.registration_id}
            </Link>
            <button type="button" className="nav-logout" onClick={handleLogout}>Logout</button>
          </span>
        ) : (
          <Link to="/registration/find" className="nav-login-pill">
            {t('nav.login') || 'Login'}
          </Link>
        )}
      </nav>

      <SiteMarquee />
    </>
  )
}
