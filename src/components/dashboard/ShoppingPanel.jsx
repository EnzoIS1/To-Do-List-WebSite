import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'

/**
 * La liste de courses, toujours visible.
 *
 * Elle n'a pas de table à elle : ce sont des tâches ordinaires rangées dans la
 * catégorie « Courses », sans échéance. La catégorie est reconnue par son nom
 * — si tu la renommes, adapte `estCategorieCourses` dans DashboardPage.
 */
export default function ShoppingPanel({
  categorie, taches, loading, creer, cocher, supprimer, onCreerCategorie,
}) {
  if (!categorie) {
    return (
      <Panneau titre="Liste de courses">
        <p className="etat-vide">Aucune catégorie « Courses » pour l'instant.</p>
        <button className="bouton-doux" onClick={onCreerCategorie}>
          Créer la catégorie Courses
        </button>
      </Panneau>
    )
  }

  // « Ajouter une tâche… » dans une liste de courses : le mot ne
  // correspond à rien de ce qu'on y écrit. Ce sont des articles.
  const articles = taches.filter((t) => t.category_id === categorie.id)
  const aPrendre = articles.filter((t) => !t.is_done).length

  return (
    <Panneau
      titre="Liste de courses"
      accent={categorie.color}
      action={<span className="compteur" title="Articles à prendre">{aPrendre}</span>}
      pied={(
        <QuickAdd
          onCreer={creer} categoryId={categorie.id} sansDate
          placeholder="Ajouter un article…"
        />
      )}
      className="panneau-courses"
    >
      <TaskList
        taches={articles}
        loading={loading}
        onCocher={cocher}
        vide="Le panier est vide."
      />
    </Panneau>
  )
}
