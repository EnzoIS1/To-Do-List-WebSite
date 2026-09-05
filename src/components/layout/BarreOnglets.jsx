import { NavLink } from 'react-router-dom'
import Icone from './Icones'

/**
 * La barre d'onglets du téléphone, en bas de l'écran.
 *
 * En bas parce que c'est là que le pouce arrive. Chaque cible fait au moins
 * 44 px de haut, et la barre réserve la zone sûre du bas (la barre de gestes
 * des téléphones sans bouton d'accueil) via env(safe-area-inset-bottom).
 *
 * Les destinations sont les mêmes que celles du rail du bureau, et les
 * pictogrammes viennent du même fichier : changer une icône la change des
 * deux côtés, sans risque de voir les deux navigations diverger.
 */
const ONGLETS = [
  { to: '/', fin: true, nom: 'Tâches', icone: 'check' },
  { to: '/calendrier', nom: 'Calendrier', icone: 'calendrier' },
  { to: '/listes', nom: 'Listes', icone: 'liste' },
  { to: '/reglages', nom: 'Réglages', icone: 'reglages' },
]

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
