import Panneau from './Panneau'
import MonthGrid from '../calendar/MonthGrid'
import { formatMonth, shiftMonth, monthOf, today } from '../../lib/dates'

/**
 * Le bouton « Aujourd'hui » est passé à gauche, à côté du titre, et le mois
 * a pris sa place entre les deux flèches : on lit « ← Septembre 2026 → »,
 * ce qui dit tout de suite à quoi servent les flèches.
 */
export default function CalendarPanel({ mois, setMois, jourChoisi, onJourClique, taches, couleurDe }) {
  const revenirAujourdhui = () => { setMois(monthOf(today())); onJourClique(today()) }

  return (
    <Panneau
      titre="Calendrier"
      className="panneau-calendrier"
      sousTitre={<button className="bouton-doux bouton-aujourdhui" onClick={revenirAujourdhui}>Aujourd'hui</button>}
      action={
        <div className="nav-mois">
          <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
          <span className="mois-courant">{formatMonth(mois)}</span>
          <button onClick={() => setMois(shiftMonth(mois, 1))} aria-label="Mois suivant">→</button>
        </div>
      }
    >
      <MonthGrid
        mois={mois}
        taches={taches}
        jourChoisi={jourChoisi}
        onJourClique={onJourClique}
        couleurDe={couleurDe}
      />
    </Panneau>
  )
}
