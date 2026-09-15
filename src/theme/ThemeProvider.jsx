import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CLE_THEME = 'todo-theme'
const CLE_ACCENT = 'todo-accent'
const CLE_AMBIANCE = 'todo-ambiance'
const THEMES = ['systeme', 'clair', 'sombre']

/**
 * Les ambiances : trois habillages, définis dans styles/ambiances.css.
 *
 * Elles ne remplacent pas le thème, elles l'habillent : mêmes variables,
 * plus un fond et du verre dépoli. `null` = aucune, on retrouve exactement
 * l'apparence d'avant.
 *
 * CHAQUE AMBIANCE A DEUX VISAGES — un de jour, un de nuit — et c'est le
 * thème qui décide lequel s'affiche. Une ambiance n'est donc plus un
 * choix « au lieu du thème clair », mais un habillage qui suit le thème,
 * comme le ferait une vraie fenêtre selon l'heure.
 *
 * Le nom change avec le visage : « Minuit » en plein jour n'aurait aucun
 * sens. C'est la même famille de couleurs, pas le même moment.
 */
export const AMBIANCES = [
  {
    id: 'nebuleuse',
    sombre: {
      nom: 'Nébuleuse',
      aide: 'Bleu roi, lueur en haut à gauche.',
      apercu: 'linear-gradient(135deg,#1b3bff 0%,#0a1128 55%,#060a17 100%)',
    },
    clair: {
      nom: 'Ciel',
      aide: 'Blanc bleuté, même lueur au petit matin.',
      apercu: 'linear-gradient(135deg,#7fa8ff 0%,#e9f0fd 55%,#dfe8fa 100%)',
    },
  },
  {
    id: 'minuit',
    sombre: {
      nom: 'Minuit',
      aide: 'Presque noir, halo violet.',
      apercu: 'linear-gradient(135deg,#6d5bff 0%,#0a0b18 55%,#04050c 100%)',
    },
    clair: {
      nom: 'Aube',
      aide: 'Lilas très pâle, rosé sur la droite.',
      apercu: 'linear-gradient(135deg,#a98cff 0%,#f1ecfc 55%,#e8e2f8 100%)',
    },
  },
  {
    id: 'aurore',
    sombre: {
      nom: 'Aurore',
      aide: 'Vert-noir, turquoise et trame fine.',
      apercu: 'linear-gradient(135deg,#10b981 0%,#07150f 55%,#030b08 100%)',
    },
    clair: {
      nom: 'Lagon',
      aide: 'Eau claire, turquoise et trame fine.',
      apercu: 'linear-gradient(135deg,#3fd3ac 0%,#e8f6f1 55%,#ddefe8 100%)',
    },
  },
]

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
  const [ambiance, setAmbianceInterne] = useState(() => {
    const v = lire(CLE_AMBIANCE, null)
    return AMBIANCES.some((a) => a.id === v) ? v : null
  })
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

  /*
   * DEUX attributs : laquelle, et sur quel ton.
   *
   * Le ton ne peut pas être déduit en CSS seul. Quand le thème vaut
   * « Système », aucun `data-theme` n'est écrit sur la page — c'est la
   * requête média qui tranche — donc une règle `:not([data-theme="dark"])`
   * se tromperait une fois sur deux. C'est ici qu'on connaît le thème
   * réellement rendu (`resolu`), donc c'est ici qu'on l'écrit.
   */
  useEffect(() => {
    const racine = document.documentElement
    if (ambiance) {
      racine.setAttribute('data-ambiance', ambiance)
      racine.setAttribute('data-ambiance-ton', resolu === 'sombre' ? 'sombre' : 'clair')
    } else {
      racine.removeAttribute('data-ambiance')
      racine.removeAttribute('data-ambiance-ton')
    }
  }, [ambiance, resolu])

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

  /*
   * Choisir une ambiance NE TOUCHE PLUS au thème.
   *
   * Elle le forçait en sombre, parce qu'il n'existait pas de recette de
   * verre clair : cliquer sur « Nébuleuse » depuis le thème clair
   * n'aurait rien fait, ce qui passe pour un bouton cassé. Maintenant que
   * chaque ambiance a un visage de jour, le thème et l'ambiance sont deux
   * réglages indépendants — et c'est l'utilisateur qui garde la main sur
   * le sien.
   */
  const setAmbiance = useCallback((v) => {
    const valide = AMBIANCES.some((a) => a.id === v) ? v : null
    setAmbianceInterne(valide); ecrire(CLE_AMBIANCE, valide)
  }, [])

  const value = useMemo(
    () => ({
      theme, setTheme, themes: THEMES,
      accent, setAccent, accents: ACCENTS,
      ambiance, setAmbiance, ambiances: AMBIANCES,
      resolu,
    }),
    [theme, setTheme, accent, setAccent, ambiance, setAmbiance, resolu]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() doit être appelé dans un <ThemeProvider>')
  return ctx
}
