import { useState } from 'react'
import { useTasks } from '../data/useTasks'
import { useCategories } from '../data/useCategories'
import CalendarPanel from '../components/dashboard/CalendarPanel'
import TodayPanel from '../components/dashboard/TodayPanel'
import ShoppingPanel from '../components/dashboard/ShoppingPanel'
import InboxPanel from '../components/dashboard/InboxPanel'
import CategoryColumn from '../components/categories/CategoryColumn'
import { today, monthOf, monthOf as moisDe } from '../lib/dates'

/** La catégorie « Courses » est reconnue par son nom, sans colonne dédiée. */
const estCategorieCourses = (c) => c.name.trim().toLowerCase().startsWith('course')

/**
 * Le tableau de bord unique : tout tient dans une fenêtre, chaque panneau
 * défile pour son compte.
 *
 * Un seul appel à useTasks pour toute la page. Chaque panneau reçoit la liste
 * complète et filtre ce qui le concerne : six panneaux qui interrogeraient
 * chacun Supabase feraient six requêtes pour les mêmes lignes.
 */
export default function DashboardPage() {
  const [mois, setMois] = useState(monthOf(today()))
  const [jourChoisi, setJourChoisi] = useState(today())

  const { tasks, loading, creer, cocher, supprimer } = useTasks({ includeDone: true })
  const { arbre, categories, creer: creerCategorie, modifier: modifierCategorie } = useCategories()

  const categorieCourses = categories.find(estCategorieCourses)
  // Courses a son propre panneau au centre : inutile de la répéter à droite.
  const categoriesDeLaColonne = arbre.filter((c) => !estCategorieCourses(c))

  /** La couleur choisie dans les paramètres se retrouve jusque dans le calendrier. */
  const couleurDe = (tache) =>
    categories.find((c) => c.id === tache.category_id)?.color ?? 'var(--discret)'

  /** Cliquer un jour du mois voisin fait aussi basculer la vue sur ce mois. */
  function choisirJour(jour) {
    setJourChoisi(jour)
    const m = moisDe(jour)
    if (m.year !== mois.year || m.month !== mois.month) setMois(m)
  }

  function demanderNouvelleCategorie(parent = null) {
    const name = window.prompt(
      parent ? `Nouvelle sous-catégorie dans « ${parent.name} »` : 'Nom de la nouvelle catégorie'
    )
    if (!name?.trim()) return
    creerCategorie({
      name: name.trim(),
      parent_id: parent?.id ?? null,
      color: parent?.color ?? '#14614E',
    })
  }

  return (
    <div className="tableau">
      <div className="zone-calendrier">
        <CalendarPanel
          mois={mois}
          setMois={setMois}
          jourChoisi={jourChoisi}
          onJourClique={choisirJour}
          taches={tasks}
          couleurDe={couleurDe}
        />
      </div>

      <div className="zone-basse">
        <TodayPanel
          jour={jourChoisi}
          taches={tasks}
          loading={loading}
          creer={creer}
          cocher={cocher}
          supprimer={supprimer}
        />

        <div className="pile-secondaire">
          <ShoppingPanel
            categorie={categorieCourses}
            taches={tasks}
            loading={loading}
            creer={creer}
            cocher={cocher}
            supprimer={supprimer}
            onCreerCategorie={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}
          />
          <InboxPanel
            taches={tasks}
            loading={loading}
            creer={creer}
            cocher={cocher}
            supprimer={supprimer}
          />
        </div>
      </div>

      <div className="zone-categories">
        <CategoryColumn
          arbre={categoriesDeLaColonne}
          taches={tasks}
          loading={loading}
          creer={creer}
          cocher={cocher}
          supprimer={supprimer}
          modifier={modifierCategorie}
          creerCategorie={() => demanderNouvelleCategorie(null)}
          creerSousCategorie={(parent) => demanderNouvelleCategorie(parent)}
        />
      </div>
    </div>
  )
}
