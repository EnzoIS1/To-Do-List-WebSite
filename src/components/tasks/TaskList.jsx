import TaskItem from './TaskItem'
import EmptyState from '../ui/EmptyState'

export default function TaskList({
  taches, loading, onCocher, onSupprimer, vide, etiquette, onDater, categories,
}) {
  if (loading) return <p className="etat">Chargement…</p>
  if (taches.length === 0) return <EmptyState>{vide ?? 'Rien à faire ici.'}</EmptyState>

  return (
    <ul className="liste-taches">
      {taches.map((t) => (
        <TaskItem
          key={t.id}
          tache={t}
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
