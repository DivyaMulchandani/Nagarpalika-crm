import { createContext, useContext, useState } from 'react'
import { T } from '../data/i18n'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('guj-lang') || 'en' } catch { return 'en' }
  })

  function setLang(l) {
    setLangState(l)
    try { localStorage.setItem('guj-lang', l) } catch {}
  }

  function t(key) {
    return T[lang]?.[key] ?? T.en?.[key] ?? key
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
