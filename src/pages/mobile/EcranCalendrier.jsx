import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import WeekStrip from '../../components/calendar/WeekStrip'
import MonthGrid from '../../components/calendar/MonthGrid'
import TaskList from '../../components/tasks/TaskList'
import BarreCapture from '../../components/capture/BarreCapture'
import { today, monthOf, shiftMonth, formatMonth, formatLong } from '../../lib/dates'

export default function EcranCalendrier() {
  const {
    tasks, loading, creer, modifier, cocher, supprimer, choixCategories, couleurDe,
  } = useDonnees()

  const [jourChoisi, setJourChoisi] = useState(today())
  const [mois, setMois] = useState(monthOf(today()))
  const [vueMois, setVueMois] = useState(false)

  const duJour = tasks.filter((t) => t.due_date === jourChoisi)

  function choisirJour(jour) {
    setJourChoisi(jour)
    const m = monthOf(jour)
    if (m.year !== mois.year || m.month !== mois.month) setMois(m)
  }

  return (
    <div className="ecran">
      <header className="ecran-tete">
        <h1>{vueMois ? formatMonth(mois) : 'Calendrier'}</h1>
        <button className="bouton-doux" onClick={() => setVueMois((v) => !v)}>
          {vueMois ? 'Vue semaine' : 'Vue mois'}
        </button>
      </header>

      {vueMois ? (
        <div className="ecran-corps mois-plein">
          <div className="nav-mois">
            <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
            <span className="mois-courant">{formatMonth(mois)}</span>
            <button onClick={() => setMois(shiftMonth(mois, 1))} aria-label="Mois suivant">→</button>
          </div>
          <MonthGrid
            mois={mois}
            taches={tasks}
            jourChoisi={jourChoisi}
            couleurDe={couleurDe}
            onJourClique={(j) => { choisirJour(j); setVueMois(false) }}
          />
        </div>
      ) : (
        <>
          <WeekStrip
            jourChoisi={jourChoisi}
            taches={tasks}
            onJourClique={choisirJour}
            onSemaine={choisirJour}
          />
          <div className="ecran-corps">
            <h2 className="titre-bloc">{formatLong(jourChoisi)} · {duJour.length}</h2>
            <TaskList
              taches={duJour} loading={loading} onCocher={cocher}
              onSupprimer={supprimer} onDater={modifier}
              vide="Aucune tâche ce jour-là."
            />
          </div>
        </>
      )}

      <BarreCapture
        onCreer={creer}
        categories={choixCategories}
        dateParDefaut={jourChoisi}
        placeholder={`Ajouter au ${Number(jourChoisi.slice(8, 10))}…`}
      />
    </div>
  )
}
