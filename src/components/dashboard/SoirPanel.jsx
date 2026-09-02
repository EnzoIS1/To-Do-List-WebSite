import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import { formatLong, formatRelative, isToday, titreDuMoment, addDays } from '../../lib/dates'

/**
 * Le panneau principal du bureau : le jour choisi, puis un aperçu du
 * lendemain. C'est le geste du soir — cocher ce qui est fait, jeter un œil
 * à demain — sans changer d'écran.
 */
export default function SoirPanel({
  jour, taches, loading, cocher, supprimer, dater, categories,
}) {
  const duJour = taches.filter((t) => t.due_date === jour)
  const faites = duJour.filter((t) => t.is_done).length
  const lendemain = addDays(jour, 1)
  const demain = taches.filter((t) => t.due_date === lendemain && !t.is_done)

  return (
    <Panneau
      titre={isToday(jour) ? titreDuMoment() : formatLong(jour)}
      sousTitre={isToday(jour) ? formatLong(jour) : formatRelative(jour)}
      action={
        duJour.length > 0 && (
          <span className="compteur" title="Tâches faites sur le total du jour">
            {faites}/{duJour.length}
          </span>
        )
      }
    >
      <TaskList
        taches={duJour}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        onDater={dater}
        vide="Rien de prévu ce jour-là."
      />

      {demain.length > 0 && (
        <div className="apercu-demain">
          <h3 className="titre-bloc discret">
            {isToday(jour) ? 'Demain' : formatRelative(lendemain)} · {demain.length}
          </h3>
          <TaskList
            taches={demain}
            loading={false}
            onCocher={cocher}
            onSupprimer={supprimer}
            onDater={dater}
            vide=""
          />
        </div>
      )}
    </Panneau>
  )
}
