import { useRef, useState } from 'react'
import MenuFlottant from '../ui/MenuFlottant'
import BarreCapture from './BarreCapture'
import Icone from '../layout/Icones'
import { useDonnees } from '../../data/DonneesProvider'

/**
 * Le bouton « + » du rail, et sa petite fenêtre d'ajout.
 *
 * La barre de saisie occupait toute la largeur en haut du tableau de bord.
 * Elle prenait une ligne entière en permanence pour un geste qu'on ne fait
 * que quelques fois par jour, et elle repoussait le calendrier vers le bas.
 *
 * Elle devient une fenêtre accrochée au rail, qui passe PAR-DESSUS le
 * tableau de bord au lieu de le pousser — c'est le même <MenuFlottant> que
 * les menus « ⋯ », donc rendu par un portail sous <body> : aucun panneau ne
 * peut la découper, et elle reste au-dessus de la grille déplaçable.
 *
 * La fenêtre se ferme toute seule après un ajout : sur le tableau de bord,
 * on ajoute une tâche puis on retourne à sa journée. Pour en saisir
 * plusieurs d'affilée, il reste la barre de la page Listes.
 */
export default function BoutonAjout({ dateParDefaut = null }) {
  const [ouvert, setOuvert] = useState(false)
  const bouton = useRef(null)
  const { creer, choixCategories } = useDonnees()

  async function ajouter(champs) {
    const resultat = await creer(champs)
    if (!resultat?.error) setOuvert(false)
    return resultat
  }

  return (
    <>
      <button
        ref={bouton}
        type="button"
        className={`rail-ajout${ouvert ? ' actif' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label="Ajouter une tâche"
        title="Ajouter une tâche"
        onClick={() => setOuvert((v) => !v)}
      >
        <Icone nom="plus" taille={22} />
      </button>

      {ouvert && (
        <MenuFlottant ancre={bouton} titre="Nouvelle tâche" cote="droite" onFermer={() => setOuvert(false)}>
          <div className="menu-corps fenetre-ajout">
            <BarreCapture
              onCreer={ajouter}
              categories={choixCategories}
              dateParDefaut={dateParDefaut}
              pile
              autoFocus
            />
          </div>
        </MenuFlottant>
      )}
    </>
  )
}
