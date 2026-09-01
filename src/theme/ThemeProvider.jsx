import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CLE_THEME = 'todo-theme'
const CLE_ACCENT = 'todo-accent'
const THEMES = ['systeme', 'clair', 'sombre']

/** Six teintes qui restent lisibles dans les deux thèmes une fois dérivées. */
export const ACCENTS = [
  { nom: 'Violet', base: '#BB86FC' },
  { nom: 'Vert',   base: '#2E9E7E' },
  { nom: 'Bleu',   base: '#5B8DEF' },
  { nom: 'Ambre',  base: '#E0913A' },
  { nom: 'Rose',   base: '#E8639B' },
  { nom: 'Cyan',   base: '#3FB6C8' },
]

const ThemeContext = createContext(null)

const lire = (cle, defaut) => {
  try { return window.localStorage.getItem(cle) ?? defaut } catch { return defaut }
}
const ecrire = (cle, valeur) => {
  try {
    if (valeur === null) window.localStorage.removeItem(cle)
    else window.localStorage.setItem(cle, valeur)
  } catch { /* stockage refusé : le choix ne vaut que pour cette session */ }
}

const versRvb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const versHex = (rvb) => '#' + rvb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Une même couleur ne peut pas contraster suffisamment sur fond blanc ET sur
 * fond noir : mesuré, aucune des six teintes n'y arrive brute. On dérive donc
 * une variante par thème depuis la base choisie — assombrie de 35 % en thème
 * clair, éclaircie de 35 % en sombre. À ce dosage, les six teintes dépassent
 * toutes le seuil WCAG de 4,5:1 sur leur fond respectif.
 */
function deriver(base, sombre) {
  const cible = sombre ? 255 : 0
  return versHex(versRvb(base).map((v) => v + 0.35 * (cible - v)))
}

function themeResolu(theme) {
  if (theme !== 'systeme') return theme
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair'
  } catch {
    return 'clair'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeInterne] = useState(() => {
    const v = lire(CLE_THEME, 'systeme')
    return THEMES.includes(v) ? v : 'systeme'
  })
  const [accent, setAccentInterne] = useState(() => lire(CLE_ACCENT, null))
  const [resolu, setResolu] = useState(() => themeResolu(theme))

  // Le thème « Système » peut changer pendant que la page est ouverte.
  useEffect(() => {
    setResolu(themeResolu(theme))
    if (theme !== 'systeme') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const suivre = () => setResolu(themeResolu('systeme'))
    mq.addEventListener('change', suivre)
    return () => mq.removeEventListener('change', suivre)
  }, [theme])

  // Le thème choisi s'écrit dans data-theme, que tokens.css lit.
  // « Système » n'écrit rien : la règle @media reprend alors la main.
  useEffect(() => {
    const racine = document.documentElement
    if (theme === 'systeme') racine.removeAttribute('data-theme')
    else racine.setAttribute('data-theme', theme === 'sombre' ? 'dark' : 'light')
  }, [theme])

  // Pas d'accent choisi = aucune surcharge, la valeur du thème s'applique.
  useEffect(() => {
    const racine = document.documentElement
    if (!accent) racine.style.removeProperty('--accent')
    else racine.style.setProperty('--accent', deriver(accent, resolu === 'sombre'))
  }, [accent, resolu])

  const setTheme = useCallback((v) => {
    if (!THEMES.includes(v)) return
    setThemeInterne(v); ecrire(CLE_THEME, v)
  }, [])

  const setAccent = useCallback((v) => {
    setAccentInterne(v); ecrire(CLE_ACCENT, v)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, themes: THEMES, accent, setAccent, accents: ACCENTS, resolu }),
    [theme, setTheme, accent, setAccent, resolu]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() doit être appelé dans un <ThemeProvider>')
  return ctx
}
