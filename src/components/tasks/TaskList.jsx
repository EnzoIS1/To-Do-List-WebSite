import TaskItem from './TaskItem'
import EmptyState from '../ui/EmptyState'
import { useDonnees } from '../../data/DonneesProvider'

/**
 * TaskList est le seul composant d'affichage qui touche au contexte : il y
 * prend la couleur de la catégorie de chaque tâche et la passe à la ligne,
 * pour que la coche s'y teinte. Ça évite de faire descendre `couleurDe` à
 * travers les six endroits qui affichent une liste.
 */
export default function TaskList({
  taches, loading, onCocher, onSupprimer, vide, etiquette, onDater, categories,
}) {
  const { couleurDe } = useDonnees()

  if (loading) return <p className="etat">Chargement…</p>
  if (taches.length === 0) return <EmptyState>{vide ?? 'Rien à faire ici.'}</EmptyState>

  return (
    <ul className="liste-taches">
      {taches.map((t) => (
        <TaskItem
          key={t.id}
          tache={t}
          teinte={couleurDe(t)}
          etiquette={etiquette?.(t)}
          onCocher={onCocher}
          onSupprimer={onSupprimer}
          onDater={onDater}
          categories={categories}
        />
      ))}
    </ul>
  )
}
