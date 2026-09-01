import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'
import { formatLong, formatRelative, isToday } from '../../lib/dates'

/**
 * « Le jour même — récapitulatif des tâches » du croquis.
 * Suit le jour sélectionné dans le calendrier, et vaut aujourd'hui au départ.
 */
export default function TodayPanel({
  jour, taches, loading, creer, cocher, supprimer, dater, categories,
}) {
  const duJour = taches.filter((t) => t.due_date === jour)
  const faites = duJour.filter((t) => t.is_done).length

  return (
    <Panneau
      titre={isToday(jour) ? "Aujourd'hui" : formatLong(jour)}
      sousTitre={isToday(jour) ? formatLong(jour) : formatRelative(jour)}
      action={
        duJour.length > 0 && (
          <span className="compteur" title="Tâches faites sur le total du jour">
            {faites}/{duJour.length}
          </span>
        )
      }
      pied={<QuickAdd onCreer={creer} dateParDefaut={jour} categories={categories} />}
    >
      <TaskList
        taches={duJour}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        onDater={dater}
        vide="Rien de prévu ce jour-là."
      />
    </Panneau>
  )
}
