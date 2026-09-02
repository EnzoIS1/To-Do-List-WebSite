import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'

/**
 * Prise de note : ce qu'on écrit à la volée, sans avoir décidé du rangement.
 *
 * Ce panneau n'a plus de champ d'ajout à lui. C'était le défaut relevé
 * pendant la revue : cinq champs différents obligeaient à choisir *où* avant
 * de savoir *quoi*. Maintenant, tout ce qu'on tape dans la barre du haut sans
 * date ni catégorie atterrit ici — et en repart dès qu'on lui en donne une.
 */
export default function InboxPanel({ taches, loading, cocher, supprimer, ranger, categories }) {
  const aTrier = taches.filter((t) => !t.due_date && !t.category_id)
  const restantes = aTrier.filter((t) => !t.is_done).length

  return (
    <Panneau
      titre="Prise de note"
      sousTitre="Noté sans date ni catégorie"
      action={
        restantes > 0 && (
          <span className="compteur compteur-alerte" title="Notes à ranger">{restantes}</span>
        )
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
