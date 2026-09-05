import { NavLink } from 'react-router-dom'
import Icone from './Icones'
import BoutonAjout from '../capture/BoutonAjout'
import { useAuth } from '../../auth/AuthProvider'

/**
 * Le rail de gauche, redessiné d'après la référence d'Enzo.
 *
 * Trois différences avec l'ancien :
 *
 * 1. Il est DÉTACHÉ. Ce n'était qu'une colonne de la grille de la coque,
 *    collée au bord du cadre ; c'est maintenant une pastille flottante,
 *    posée à côté de la carte. C'est ce qui donne l'allure de la référence,
 *    et ça a un effet de bord utile : la carte n'a plus de colonne fixe,
 *    donc elle peut enfin gérer sa propre hauteur (voir le bug de
 *    défilement corrigé dans global.css).
 *
 * 2. Il n'y a plus de texte sous les icônes. Sur 64 px, « Paramètres »
 *    tenait en 9 px de haut — illisible, et ça obligeait à des cibles
 *    tactiles étroites. L'infobulle et l'`aria-label` disent la même chose
 *    sans encombrer.
 *
 * 3. Il porte la navigation complète — les mêmes destinations que la barre
 *    d'onglets du téléphone — et le bouton « + » d'ajout de tâche.
 */
const DESTINATIONS = [
  { to: '/', fin: true, nom: 'Tableau de bord', icone: 'tableau' },
  { to: '/calendrier', nom: 'Calendrier', icone: 'calendrier' },
  { to: '/listes', nom: 'Listes', icone: 'liste' },
  { to: '/notes', nom: 'Prise de note', icone: 'note' },
]

/** Les initiales servent d'avatar tant qu'il n'y a pas de photo à afficher. */
function initiales(email) {
  const nom = (email ?? '').split('@')[0] ?? ''
  const morceaux = nom.split(/[.\-_]+/).filter(Boolean)
  const lettres = morceaux.length >= 2
    ? morceaux[0][0] + morceaux[1][0]
    : nom.slice(0, 2)
  return (lettres || '?').toUpperCase()
}

export default function Rail({ dateParDefaut = null }) {
  const { user } = useAuth()

  return (
    <nav className="rail" aria-label="Navigation principale">
      <div className="rail-haut">
        <BoutonAjout dateParDefaut={dateParDefaut} />

        <div className="rail-groupe">
          {DESTINATIONS.map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              end={d.fin}
              className="rail-lien"
              title={d.nom}
              aria-label={d.nom}
            >
              <Icone nom={d.icone} />
            </NavLink>
          ))}
        </div>
      </div>

      <div className="rail-bas">
        <NavLink to="/reglages" className="rail-lien" title="Paramètres" aria-label="Paramètres">
          <Icone nom="reglages" />
        </NavLink>

        <NavLink to="/compte" className="rail-avatar" title="Compte" aria-label="Compte">
          <span aria-hidden="true">{initiales(user?.email)}</span>
        </NavLink>
      </div>
    </nav>
  )
}
