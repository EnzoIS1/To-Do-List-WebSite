import { useEffect, useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import TaskList from '../../components/tasks/TaskList'
import BarreCapture from '../../components/capture/BarreCapture'
import CategoryCard from '../../components/categories/CategoryCard'
import SelecteurTri from '../../components/tasks/SelecteurTri'

const VUES = [
  { id: 'courses', nom: 'Courses' },
  { id: 'notes', nom: 'Notes' },
  { id: 'categories', nom: 'Catégories' },
]

export default function EcranListes({ vueInitiale = 'courses' }) {
  const {
    tasks, loading, creer, modifier, cocher, supprimer,
    categorieCourses, arbreSansCourses, choixCategories,
    creerCategorie, modifierCategorie, supprimerCategorie,
  } = useDonnees()

  const [vue, setVue] = useState(vueInitiale)
  // La barre d'onglets peut mener ici sur un segment précis.
  useEffect(() => { setVue(vueInitiale) }, [vueInitiale])

  const courses = categorieCourses
    ? tasks.filter((t) => t.category_id === categorieCourses.id)
    : []
  const notes = tasks.filter((t) => !t.due_date && !t.category_id)

  function demanderCategorie(parent = null) {
    const name = window.prompt(
      parent ? `Nouvelle sous-catégorie dans « ${parent.name} »` : 'Nom de la nouvelle catégorie'
    )
    if (name?.trim()) {
      creerCategorie({ name: name.trim(), parent_id: parent?.id ?? null, color: parent?.color ?? '#14614E' })
    }
  }

  return (
    <div className="ecran">
      <header className="ecran-tete colonne">
        <h1>Listes</h1>
        <div className="segments" role="tablist">
          {VUES.map((v) => (
            <button
              key={v.id} role="tab" aria-selected={vue === v.id}
              className={`segment${vue === v.id ? ' actif' : ''}`}
              onClick={() => setVue(v.id)}
            >{v.nom}</button>
          ))}
        </div>
      </header>

      <div className="ecran-corps">
        {vue === 'courses' && (
          categorieCourses ? (
            <TaskList
              taches={courses} loading={loading} onCocher={cocher}
              vide="Le panier est vide."
            />
          ) : (
            <div className="bloc-vide">
              <p className="etat-vide">Aucune catégorie « Courses » pour l'instant.</p>
              <button className="bouton-doux" onClick={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}>
                Créer la catégorie Courses
              </button>
            </div>
          )
        )}

        {vue === 'notes' && (
          <TaskList
            taches={notes} loading={loading} onCocher={cocher}
            onDater={modifier}
            vide="Tout est rangé."
          />
        )}

        {vue === 'categories' && (
          <div className="pile-categories">
            <SelecteurTri />
            {arbreSansCourses.map((c) => (
              <CategoryCard
                key={c.id} categorie={c} taches={tasks} loading={loading}
                creer={creer} cocher={cocher} supprimer={supprimer}
                modifier={modifierCategorie} dater={modifier}
                creerSousCategorie={demanderCategorie}
                supprimerCategorie={(cat) => supprimerCategorie(cat.id)}
              />
            ))}
            <button className="creer-categorie" onClick={() => demanderCategorie(null)}>
              + Créer une nouvelle catégorie
            </button>
          </div>
        )}
      </div>

      {vue !== 'categories' && (
        <BarreCapture
          onCreer={creer}
          categories={vue === 'notes' ? choixCategories : []}
          categorieParDefaut={vue === 'courses' ? categorieCourses?.id ?? null : null}
          placeholder={vue === 'courses' ? 'Ajouter un article…' : 'Noter une idée…'}
        />
      )}
    </div>
  )
}
