import { useState } from 'react'
import { useDonnees } from '../data/DonneesProvider'
import CalendarPanel from '../components/dashboard/CalendarPanel'
import SoirPanel from '../components/dashboard/SoirPanel'
import ShoppingPanel from '../components/dashboard/ShoppingPanel'
import InboxPanel from '../components/dashboard/InboxPanel'
import CategoryColumn from '../components/categories/CategoryColumn'
import BarreCapture from '../components/capture/BarreCapture'
import { today, monthOf } from '../lib/dates'

/**
 * Le tableau de bord du grand écran.
 *
 * Une seule barre de saisie en haut, le calendrier à vue (consulté tous les
 * jours), le panneau du soir en dessous, et les catégories en accordéon à
 * droite. Les données viennent du DonneesProvider — un seul chargement.
 */
export default function DashboardPage() {
  const [mois, setMois] = useState(monthOf(today()))
  const [jourChoisi, setJourChoisi] = useState(today())

  const {
    tasks, loading, creer, modifier, cocher, supprimer,
    choixCategories, categorieCourses, arbreSansCourses, couleurDe,
    creerCategorie, modifierCategorie, supprimerCategorie,
  } = useDonnees()

  function choisirJour(jour) {
    setJourChoisi(jour)
    const m = monthOf(jour)
    if (m.year !== mois.year || m.month !== mois.month) setMois(m)
  }

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
    <div className="tableau">
      <div className="zone-capture">
        <BarreCapture
          onCreer={creer}
          categories={choixCategories}
          dateParDefaut={jourChoisi}
        />
      </div>

      <div className="zone-calendrier">
        <CalendarPanel
          mois={mois} setMois={setMois}
          jourChoisi={jourChoisi} onJourClique={choisirJour}
          taches={tasks} couleurDe={couleurDe}
        />
      </div>

      <div className="zone-basse">
        <SoirPanel
          jour={jourChoisi} taches={tasks} loading={loading}
          cocher={cocher} supprimer={supprimer} dater={modifier}
          categories={choixCategories}
        />
        <div className="pile-secondaire">
          <ShoppingPanel
            categorie={categorieCourses} taches={tasks} loading={loading}
            creer={creer} cocher={cocher} supprimer={supprimer}
            onCreerCategorie={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}
          />
          <InboxPanel
            taches={tasks} loading={loading} creer={creer} cocher={cocher}
            supprimer={supprimer} ranger={modifier} categories={choixCategories}
          />
        </div>
      </div>

      <div className="zone-categories">
        <CategoryColumn
          arbre={arbreSansCourses} taches={tasks} loading={loading}
          creer={creer} cocher={cocher} supprimer={supprimer}
          modifier={modifierCategorie} dater={modifier}
          creerCategorie={() => demanderCategorie(null)}
          creerSousCategorie={(parent) => demanderCategorie(parent)}
          supprimerCategorie={(categorie) => supprimerCategorie(categorie.id)}
        />
      </div>
    </div>
  )
}
