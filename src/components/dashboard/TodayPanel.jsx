import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'
import { formatLong, formatRelative, isToday } from '../../lib/dates'

/**
 * « Le jour même — récapitulatif des tâches » du croquis.
 * Suit le jour sélectionné dans le calendrier, et vaut aujourd'hui au départ.
 */
export default function TodayPanel({ jour, taches, loading, creer, cocher, supprimer }) {
  const duJour = taches.filter((t) => t.due_date === jour)
  const restantes = duJour.filter((t) => !t.is_done).length

  return (
    <Panneau
      titre={isToday(jour) ? "Aujourd'hui" : formatLong(jour)}
      sousTitre={
        isToday(jour)
          ? formatLong(jour)
          : formatRelative(jour)
      }
      action={
        <span className="compteur" title="Tâches restantes ce jour-là">
          {restantes}
        </span>
      }
      pied={<QuickAdd onCreer={creer} dateParDefaut={jour} />}
    >
      <TaskList
        taches={duJour}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        vide="Rien de prévu ce jour-là."
      />
    </Panneau>
  )
}
