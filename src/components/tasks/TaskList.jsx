import TaskItem from './TaskItem'
import EmptyState from '../ui/EmptyState'
import { useDonnees } from '../../data/DonneesProvider'
import { trierTaches } from '../../lib/tri'

/**
 * TaskList est le seul composant d'affichage qui touche au contexte : il y
 * prend la couleur de la catégorie de chaque tâche et son éventuel rang de
 * révision, et les passe à la ligne. Ça évite de faire descendre `couleurDe`
 * à travers les six endroits qui affichent une liste.
 *
 * La suppression et le choix de la catégorie ne sont plus des props : ils
 * vivent dans le menu « ⋯ » de chaque ligne, qui lit le contexte lui-même.
 */
export default function TaskList({ taches, loading, onCocher, vide, etiquette, onDater, tri }) {
  const { couleurDe, rangDeRevision, triTaches } = useDonnees()

  if (loading) return <p className="etat">Chargement…</p>
  if (taches.length === 0) return <EmptyState>{vide ?? 'Rien à faire ici.'}</EmptyState>

  // `tri` permet à un appelant d'imposer son ordre — l'aperçu de demain, par
  // exemple, n'a rien à gagner à être trié alphabétiquement. Sinon, c'est le
  // réglage choisi dans les catégories qui s'applique, partout.
  const ordonnees = trierTaches(taches, tri ?? triTaches)

  return (
    <ul className="liste-taches">
      {ordonnees.map((t) => (
        <TaskItem
          key={t.id}
          tache={t}
          teinte={couleurDe(t)}
          etiquette={etiquette?.(t)}
          badge={rangDeRevision(t)}
          onCocher={onCocher}
          onDater={onDater}
        />
      ))}
    </ul>
  )
}
