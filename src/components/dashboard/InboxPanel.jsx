import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'

/**
 * Prise de note : ce qu'on écrit à la volée, sans avoir décidé du rangement.
 *
 * Chaque note peut recevoir sa date et sa catégorie directement ici, sans
 * passer par un autre écran. Dès qu'elle a l'une ou l'autre, elle quitte
 * ce panneau et rejoint le calendrier ou sa catégorie : la liste se vide
 * d'elle-même à mesure qu'on range.
 */
export default function InboxPanel({
  taches, loading, creer, cocher, supprimer, ranger, categories,
}) {
  const aTrier = taches.filter((t) => !t.due_date && !t.category_id)
  const restantes = aTrier.filter((t) => !t.is_done).length

  return (
    <Panneau
      titre="Prise de note"
      sousTitre="Noté vite, à ranger ensuite"
      action={
        restantes > 0 && (
          <span className="compteur compteur-alerte" title="Notes à ranger">{restantes}</span>
        )
      }
      pied={
        <QuickAdd
          onCreer={creer}
          categories={categories}
          placeholder="Noter une idée…"
        />
      }
    >
      <TaskList
        taches={aTrier}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        onDater={ranger}
        categories={categories}
        vide="Tout est rangé."
      />
    </Panneau>
  )
}
