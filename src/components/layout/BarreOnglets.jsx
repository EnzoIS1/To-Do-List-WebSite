import { NavLink } from 'react-router-dom'

/**
 * La barre d'onglets du téléphone, en bas de l'écran.
 *
 * En bas parce que c'est là que le pouce arrive. Chaque cible fait au moins
 * 44 px de haut, et la barre réserve la zone sûre du bas (la barre de gestes
 * des téléphones sans bouton d'accueil) via env(safe-area-inset-bottom).
 */
const ONGLETS = [
  { to: '/', fin: true, nom: 'Tâches', icone: 'check' },
  { to: '/calendrier', nom: 'Calendrier', icone: 'calendrier' },
  { to: '/listes', nom: 'Listes', icone: 'liste' },
  { to: '/reglages', nom: 'Réglages', icone: 'reglages' },
]

function Icone({ nom }) {
  const commun = {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (nom === 'check') return <svg {...commun}><path d="M4 12.5l5 5L20 6.5" /></svg>
  if (nom === 'calendrier') return (
    <svg {...commun}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
  if (nom === 'liste') return (
    <svg {...commun}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
  )
  return (
    <svg {...commun}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3L5.6 5.6" />
    </svg>
  )
}

export default function BarreOnglets() {
  return (
    <nav className="barre-onglets" aria-label="Navigation">
      {ONGLETS.map((o) => (
        <NavLink key={o.to} to={o.to} end={o.fin} className="onglet">
          <Icone nom={o.icone} />
          <span className="onglet-nom">{o.nom}</span>
        </NavLink>
      ))}
    </nav>
  )
}
