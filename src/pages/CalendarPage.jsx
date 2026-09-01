import { useState } from 'react'
import { useTasks } from '../data/useTasks'
import MonthGrid from '../components/calendar/MonthGrid'
import TaskList from '../components/tasks/TaskList'
import QuickAdd from '../components/tasks/QuickAdd'
import { today, monthOf, shiftMonth, formatMonth, formatLong } from '../lib/dates'

export default function CalendarPage() {
  const [mois, setMois] = useState(monthOf(today()))
  const [jourChoisi, setJourChoisi] = useState(today())

  // Toutes les tâches du compte, cochées comprises : la grille doit montrer
  // le mois entier. À affiner si le volume devient important.
  const { tasks, loading, creer, cocher, supprimer } = useTasks({ includeDone: true })
  const duJour = tasks.filter((t) => t.due_date === jourChoisi)

  return (
    <>
      <header className="entete-mois">
        <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
        <h1>{formatMonth(mois)}</h1>
        <button onClick={() => setMois(shiftMonth(mois, 1))} aria-label="Mois suivant">→</button>
      </header>

      <MonthGrid mois={mois} taches={tasks} onJourClique={setJourChoisi} />

      <section className="panneau-jour">
        <h2>{formatLong(jourChoisi)}</h2>
        <QuickAdd onCreer={creer} dateParDefaut={jourChoisi} />
        <TaskList
          taches={duJour}
          loading={loading}
          onCocher={cocher}
          onSupprimer={supprimer}
          vide="Aucune tâche ce jour-là."
        />
      </section>
    </>
  )
}
