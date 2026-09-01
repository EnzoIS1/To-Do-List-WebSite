import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CLE = 'todo-theme'
const THEMES = ['systeme', 'clair', 'sombre']

const ThemeContext = createContext(null)

/** Lecture défensive : un navigateur en navigation privée peut refuser l'accès. */
function lireThemeStocke() {
  try {
    const v = window.localStorage.getItem(CLE)
    return THEMES.includes(v) ? v : 'systeme'
  } catch {
    return 'systeme'
  }
}

/**
 * Le thème choisi est écrit dans l'attribut data-theme de <html>, que
 * tokens.css lit pour redéfinir ses couleurs. « Système » n'écrit rien :
 * la règle @media (prefers-color-scheme) reprend alors la main.
 */
function appliquer(theme) {
  const racine = document.documentElement
  if (theme === 'systeme') racine.removeAttribute('data-theme')
  else racine.setAttribute('data-theme', theme === 'sombre' ? 'dark' : 'light')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeInterne] = useState(lireThemeStocke)

  useEffect(() => { appliquer(theme) }, [theme])

  const setTheme = useCallback((valeur) => {
    if (!THEMES.includes(valeur)) return
    setThemeInterne(valeur)
    try { window.localStorage.setItem(CLE, valeur) } catch { /* stockage refusé : le thème vaut pour cette session */ }
  }, [])

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() doit être appelé dans un <ThemeProvider>')
  return ctx
}
