import { useMemo, useState } from 'react'
import { useDonnees } from '../data/DonneesProvider'
import CalendarPanel from '../components/dashboard/CalendarPanel'
import SoirPanel from '../components/dashboard/SoirPanel'
import BandeauRappels from '../components/rappels/BandeauRappels'
import { filtrer } from '../components/calendar/FiltreCategories'
import { today, monthOf } from '../lib/dates'

/**
 * Le calendrier en plein écran, sur ordinateur.
 *
 * Ce n'est pas un doublon du panneau du tableau de bord : c'est le MÊME
 * composant, à qui on donne toute la largeur au lieu d'une case de grille.
 * Le mois passe de sept colonnes serrées à sept colonnes larges, ce qui
 * change tout pour l'affichage des noms de tâches dans les cases.
 *
 * Le jour choisi reste local à la page : on vient ici pour explorer un mois,
 * et il serait déroutant que ça change le jour affiché sur le tableau de bord
 * qu'on retrouve en revenant.
 */
export default function PageCalendrier() {
  const { tasks, loading, cocher, modifier, supprimer, choixCategories, couleurDe, arbre } =
    useDonnees()

  const [mois, setMois] = useState(monthOf(today()))
  const [jourChoisi, setJourChoisi] = useState(today())
  const [categoriesActives, setCategoriesActives] = useState(() => new Set())

  const tachesFiltrees = useMemo(
    () => filtrer(tasks, categoriesActives, arbre),
    [tasks, categoriesActives, arbre]
  )

  function choisirJour(jour) {
    setJourChoisi(jour)
    const m = monthOf(jour)
    if (m.year !== mois.year || m.month !== mois.month) setMois(m)
  }

  return (
    <div className="page-pleine page-calendrier">
      <BandeauRappels />
      <div className="page-corps deux-colonnes">
        <div className="colonne-large">
          <CalendarPanel
            mois={mois} setMois={setMois}
            jourChoisi={jourChoisi} onJourClique={choisirJour}
            taches={tachesFiltrees} couleurDe={couleurDe}
            arbre={arbre}
            categoriesActives={categoriesActives}
            setCategoriesActives={setCategoriesActives}
          />
        </div>
        <div className="colonne-etroite">
          <SoirPanel
            jour={jourChoisi} taches={tachesFiltrees} loading={loading}
            cocher={cocher} supprimer={supprimer} dater={modifier}
            categories={choixCategories}
          />
        </div>
      </div>
    </div>
  )
}
