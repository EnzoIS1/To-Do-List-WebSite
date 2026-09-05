import { useEffect, useState } from 'react'
import { useDonnees } from '../data/DonneesProvider'
import ShoppingPanel from '../components/dashboard/ShoppingPanel'
import InboxPanel from '../components/dashboard/InboxPanel'
import CategoryColumn from '../components/categories/CategoryColumn'
import BandeauRappels from '../components/rappels/BandeauRappels'
import SelecteurTri from '../components/tasks/SelecteurTri'

const VUES = [
  { id: 'courses', nom: 'Courses' },
  { id: 'notes', nom: 'Prise de note' },
  { id: 'categories', nom: 'Catégories' },
]

/**
 * Les listes en plein écran, sur ordinateur : courses, prise de note et
 * catégories, avec les mêmes trois segments que sur téléphone pour ne pas
 * avoir à réapprendre l'application en changeant d'appareil.
 *
 * `vueInitiale` permet au rail d'ouvrir directement la bonne section :
 * l'entrée « Prise de note » arrive ici sur le segment « notes ».
 */
export default function PageListes({ vueInitiale = 'courses' }) {
  const {
    tasks, loading, cocher, modifier, supprimer,
    categorieCourses, arbreSansCourses, creer,
    creerCategorie, modifierCategorie, supprimerCategorie,
  } = useDonnees()

  const [vue, setVue] = useState(vueInitiale)

  // Le rail peut mener ici depuis deux entrées différentes : on suit celle
  // qui a été empruntée, sinon cliquer « Prise de note » depuis « Listes »
  // ne changerait rien à l'écran.
  useEffect(() => { setVue(vueInitiale) }, [vueInitiale])

  function demanderCategorie(parent = null) {
    const name = window.prompt(
      parent ? `Nouvelle sous-catégorie dans « ${parent.name} »` : 'Nom de la nouvelle catégorie'
    )
    if (!name?.trim()) return
    creerCategorie({
      name: name.trim(), parent_id: parent?.id ?? null, color: parent?.color ?? '#14614E',
    })
  }

  return (
    <div className="page-pleine">
      <BandeauRappels />

      <div className="page-tete rangee">
        <div className="segments" role="tablist">
          {VUES.map((v) => (
            <button
              key={v.id} role="tab" aria-selected={vue === v.id}
              className={`segment${vue === v.id ? ' actif' : ''}`}
              onClick={() => setVue(v.id)}
            >{v.nom}</button>
          ))}
        </div>
        {vue === 'categories' && <SelecteurTri />}
      </div>

      <div className="page-corps">
        {vue === 'courses' && (
          <ShoppingPanel
            categorie={categorieCourses} taches={tasks} loading={loading}
            creer={creer} cocher={cocher} supprimer={supprimer}
            onCreerCategorie={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}
          />
        )}

        {vue === 'notes' && (
          <InboxPanel
            taches={tasks} loading={loading} cocher={cocher}
            ranger={modifier} creer={creer}
          />
        )}

        {vue === 'categories' && (
          <CategoryColumn
            arbre={arbreSansCourses} taches={tasks} loading={loading}
            creer={creer} cocher={cocher} supprimer={supprimer}
            modifier={modifierCategorie} dater={modifier}
            creerCategorie={() => demanderCategorie(null)}
            creerSousCategorie={(parent) => demanderCategorie(parent)}
            supprimerCategorie={(categorie) => supprimerCategorie(categorie.id)}
          />
        )}
      </div>
    </div>
  )
}
