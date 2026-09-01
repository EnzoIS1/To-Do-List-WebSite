import Panneau from './Panneau'
import MonthGrid from '../calendar/MonthGrid'
import { formatMonth, shiftMonth, monthOf, today } from '../../lib/dates'

export default function CalendarPanel({ mois, setMois, jourChoisi, onJourClique, taches, couleurDe }) {
  return (
    <Panneau
      titre="Calendrier"
      sousTitre={formatMonth(mois)}
      className="panneau-calendrier"
      action={
        <div className="nav-mois">
          <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
          <button className="bouton-doux" onClick={() => { setMois(monthOf(today())); onJourClique(today()) }}>
            Aujourd'hui
          </button>
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
