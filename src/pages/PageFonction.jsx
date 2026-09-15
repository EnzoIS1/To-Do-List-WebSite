import { Link, Navigate, useParams } from 'react-router-dom'
import { useDonnees } from '../data/DonneesProvider'
import { FONCTIONNALITES } from '../lib/fonctionnalites'
import PanneauBilan from '../components/dashboard/PanneauBilan'
import PanneauAttentes from '../components/dashboard/PanneauAttentes'

/**
 * La page dédiée d'une fonctionnalité.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI UNE SEULE PAGE POUR TOUTES
 *
 * Une route par fonctionnalité, c'est un fichier de plus à écrire à
 * chaque ajout, pour rendre exactement le même composant que sur le
 * tableau de bord. Ici, l'identifiant est dans l'URL et le panneau est
 * choisi dans une table. Ajouter une fonctionnalité déplaçable demande
 * une ligne dans `PANNEAUX`.
 *
 * LE PANNEAU EST LE MÊME, IL A JUSTE PLUS DE PLACE
 *
 * C'est délibéré : deux rendus d'une même liste finiraient par diverger,
 * et l'un des deux serait toujours le parent pauvre. Le panneau « En
 * attente » dans une colonne de quatre unités est serré ; le même en
 * pleine page respire, sans une ligne de code de plus.
 *
 * LES DEUX GARDE-FOUS
 *
 * Une URL peut être tapée à la main, mise en favori, ou rester dans
 * l'historique après qu'on a éteint la fonctionnalité. On vérifie donc
 * qu'elle existe ET qu'elle est active — sinon on renvoie au tableau de
 * bord plutôt que d'afficher une page vide.
 * ─────────────────────────────────────────────────────────────────────
 */
const PANNEAUX = {
  bilan: PanneauBilan,
  delegation: PanneauAttentes,
}

export default function PageFonction() {
  const { id } = useParams()
  const { fonctionActive } = useDonnees()

  const fonction = FONCTIONNALITES.find((f) => f.id === id)
  const Panneau = PANNEAUX[id]

  if (!fonction || !Panneau || !fonctionActive(id)) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="page-fonction">
      <header className="entete-page">
        <div>
          <h1>{fonction.nom}</h1>
          <p className="sous-titre">{fonction.resume}</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      <div className="fonction-pleine-page">
        <Panneau />
      </div>
    </main>
  )
}
