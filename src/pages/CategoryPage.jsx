import { useParams } from 'react-router-dom'
import { useTasks } from '../data/useTasks'
import { useCategories } from '../data/useCategories'
import TaskList from '../components/tasks/TaskList'
import QuickAdd from '../components/tasks/QuickAdd'

/**
 * Une catégorie : « Rendus », « Courses »…
 * La liste de courses n'est pas un écran à part — c'est cette page,
 * sur la catégorie « Courses », avec des tâches sans échéance.
 */
export default function CategoryPage() {
  const { id } = useParams()
  const { categories } = useCategories()
  const categorie = categories.find((c) => c.id === id)
  const { tasks, loading, creer, cocher, supprimer } = useTasks({ categoryId: id })

  return (
    <>
      <h1>{categorie?.name ?? 'Catégorie'}</h1>

      <QuickAdd onCreer={creer} categoryId={id} />

      <TaskList
        taches={tasks}
        loading={loading}
        onCocher={cocher}
        onSupprimer={supprimer}
        vide="Cette catégorie est vide."
      />
    </>
  )
}
