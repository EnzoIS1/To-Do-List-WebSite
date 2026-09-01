import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'

/**
 * Boîte de réception : les tâches notées à la volée, sans date ni catégorie.
 *
 * C'est l'endroit où l'on écrit sans réfléchir au rangement. À vider
 * régulièrement, sinon ça devient un cimetière — d'où le compteur bien visible.
 */
export default function InboxPanel({ taches, loading, creer, cocher, supprimer }) {
  const aTrier = taches.filter((t) => !t.due_date && !t.category_id)

  return (
    <Panneau
      titre="Boîte de réception"
      sousTitre="Noté vite, à ranger plus tard"
      action={
        aTrier.filter((t) => !t.is_done).length > 0 && (
          <span className="compteur compteur-alerte" title="Tâches à trier">
            {aTrier.filter((t) => !t.is_done).length}
          </span>
        )
      }
      pied={<QuickAdd onCreer={creer} sansDate placeholder="Noter une idée…" />}
    >
      <TaskList
        taches={aTrier}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        vide="Tout est rangé."
      />
    </Panneau>
  )
}
