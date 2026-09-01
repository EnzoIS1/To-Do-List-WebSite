import { useTasks } from '../data/useTasks'
import TaskList from '../components/tasks/TaskList'
import QuickAdd from '../components/tasks/QuickAdd'
import { today, formatLong } from '../lib/dates'

/**
 * L'écran d'accueil : tout ce qui est dû aujourd'hui ou en retard.
 * `dueBefore: today()` couvre les deux d'un coup.
 */
export default function TodayPage() {
  const jour = today()
  const { tasks, loading, creer, cocher, supprimer } = useTasks({ dueBefore: jour })

  return (
    <>
      <h1>Aujourd'hui</h1>
      <p className="sous-titre">{formatLong(jour)}</p>

      <QuickAdd onCreer={creer} dateParDefaut={jour} />

      <TaskList
        taches={tasks}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        vide="Rien de prévu aujourd'hui. Profites-en."
      />
    </>
  )
}
