import Panneau from './Panneau'
import MonthGrid from '../calendar/MonthGrid'
import { useDonnees } from '../../data/DonneesProvider'
import FiltreCategories from '../calendar/FiltreCategories'
import { formatMonth, shiftMonth, monthOf, today } from '../../lib/dates'

/**
 * Le panneau calendrier : le mois entre les flèches, « Aujourd'hui » près du
 * titre, et le filtre de catégories sous l'en-tête.
 */
export default function CalendarPanel({
  mois, setMois, jourChoisi, onJourClique, taches, couleurDe,
  arbre, categoriesActives, setCategoriesActives,
}) {
  const { joursAvecRappel } = useDonnees()

  const revenirAujourdhui = () => { setMois(monthOf(today())); onJourClique(today()) }

  return (
    <Panneau
      titre="Calendrier"
      className="panneau-calendrier"
      sousTitre={
        <button className="bouton-doux bouton-aujourdhui" onClick={revenirAujourdhui}>
          Aujourd'hui
        </button>
      }
      action={
        <div className="nav-mois">
          <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
          <span className="mois-courant">{formatMonth(mois)}</span>
          <button onClick={() => setMois(shiftMonth(mois, 1))} aria-label="Mois suivant">→</button>
        </div>
      }
    >
      <FiltreCategories
        categories={arbre}
        actives={categoriesActives}
        onChange={setCategoriesActives}
      />
      <MonthGrid
        joursAvecRappel={joursAvecRappel}
        mois={mois}
        taches={taches}
        jourChoisi={jourChoisi}
        onJourClique={onJourClique}
        couleurDe={couleurDe}
      />
    </Panneau>
  )
}
