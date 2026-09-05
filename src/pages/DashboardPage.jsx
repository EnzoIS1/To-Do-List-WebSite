import { useMemo, useState } from 'react'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

import { useDonnees } from '../data/DonneesProvider'
import { useReglage } from '../lib/useReglage'
import CalendarPanel from '../components/dashboard/CalendarPanel'
import SoirPanel from '../components/dashboard/SoirPanel'
import ShoppingPanel from '../components/dashboard/ShoppingPanel'
import InboxPanel from '../components/dashboard/InboxPanel'
import CategoryColumn from '../components/categories/CategoryColumn'
import BarreCapture from '../components/capture/BarreCapture'
import BandeauRappels from '../components/rappels/BandeauRappels'
import { filtrer } from '../components/calendar/FiltreCategories'
import { today, monthOf } from '../lib/dates'

/** Les panneaux disponibles, dans l'ordre où on les propose à l'ajout. */
export const PANNEAUX = [
  { id: 'calendrier', nom: 'Calendrier' },
  { id: 'jour', nom: 'Tâches du jour' },
  { id: 'courses', nom: 'Liste de courses' },
  { id: 'notes', nom: 'Prise de note' },
  { id: 'categories', nom: 'Catégories' },
]

/**
 * Disposition de départ, en 12 colonnes.
 * `minW`/`minH` empêchent de réduire un panneau au point de le rendre inutile.
 */
const DISPOSITION_DEFAUT = [
  { i: 'calendrier', x: 0, y: 0, w: 8, h: 15, minW: 4, minH: 10 },
  { i: 'jour', x: 0, y: 15, w: 4, h: 11, minW: 3, minH: 6 },
  { i: 'courses', x: 4, y: 15, w: 4, h: 6, minW: 2, minH: 4 },
  { i: 'notes', x: 4, y: 21, w: 4, h: 5, minW: 2, minH: 4 },
  { i: 'categories', x: 8, y: 0, w: 4, h: 26, minW: 3, minH: 8 },
]

export default function DashboardPage() {
  /*
   * react-grid-layout 2 ne fournit plus WidthProvider : on mesure soi-même la
   * largeur du conteneur avec son hook, et on n'affiche la grille qu'une fois
   * la mesure faite — sinon elle se dessine à une largeur par défaut puis
   * saute à la bonne.
   */
  const { width, containerRef, mounted } = useContainerWidth()
  const [mois, setMois] = useState(monthOf(today()))
  const [jourChoisi, setJourChoisi] = useState(today())
  const [categoriesActives, setCategoriesActives] = useState(() => new Set())
  const [personnalise, setPersonnalise] = useState(false)

  const [disposition, setDisposition, reinitialiserDisposition] =
    useReglage('todo-disposition', DISPOSITION_DEFAUT)
  const [masques, setMasques] = useReglage('todo-panneaux-masques', [])

  const {
    tasks, loading, creer, modifier, cocher, supprimer,
    choixCategories, categorieCourses, arbre, arbreSansCourses, couleurDe,
    creerCategorie, modifierCategorie, supprimerCategorie,
  } = useDonnees()

  const visible = (id) => !masques.includes(id)
  const tachesFiltrees = useMemo(
    () => filtrer(tasks, categoriesActives, arbre),
    [tasks, categoriesActives, arbre]
  )

  /** La grille ne reçoit que les panneaux affichés. */
  const layout = useMemo(
    () => disposition.filter((p) => visible(p.i)),
    [disposition, masques]
  )

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

  /** On ne mémorise la disposition que si elle a vraiment changé. */
  function enregistrerDisposition(nouvelle) {
    if (!personnalise) return
    const fusion = disposition.map((p) => nouvelle.find((n) => n.i === p.i) ?? p)
    setDisposition(fusion)
  }

  function basculerPanneau(id) {
    setMasques(masques.includes(id) ? masques.filter((m) => m !== id) : [...masques, id])
  }

  const contenu = {
    calendrier: (
      <CalendarPanel
        mois={mois} setMois={setMois}
        jourChoisi={jourChoisi} onJourClique={choisirJour}
        taches={tachesFiltrees} couleurDe={couleurDe}
        arbre={arbre}
        categoriesActives={categoriesActives}
        setCategoriesActives={setCategoriesActives}
      />
    ),
    jour: (
      <SoirPanel
        jour={jourChoisi} taches={tachesFiltrees} loading={loading}
        cocher={cocher} supprimer={supprimer} dater={modifier}
        categories={choixCategories}
      />
    ),
    courses: (
      <ShoppingPanel
        categorie={categorieCourses} taches={tasks} loading={loading}
        creer={creer} cocher={cocher} supprimer={supprimer}
        onCreerCategorie={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}
      />
    ),
    notes: (
      <InboxPanel
        taches={tasks} loading={loading} cocher={cocher}
        supprimer={supprimer} ranger={modifier} categories={choixCategories}
      />
    ),
    categories: (
      <CategoryColumn
        arbre={arbreSansCourses} taches={tasks} loading={loading}
        creer={creer} cocher={cocher} supprimer={supprimer}
        modifier={modifierCategorie} dater={modifier}
        creerCategorie={() => demanderCategorie(null)}
        creerSousCategorie={(parent) => demanderCategorie(parent)}
        supprimerCategorie={(categorie) => supprimerCategorie(categorie.id)}
      />
    ),
  }

  return (
    <div className={`tableau${personnalise ? ' en-edition' : ''}`}>
      <div className="tableau-barre">
        <BarreCapture
          onCreer={creer}
          categories={choixCategories}
          dateParDefaut={jourChoisi}
        />
        <button
          type="button"
          className={`bouton-doux bouton-personnaliser${personnalise ? ' actif' : ''}`}
          aria-pressed={personnalise}
          onClick={() => setPersonnalise((v) => !v)}
        >
          {personnalise ? 'Terminer' : 'Personnaliser'}
        </button>
      </div>

      {personnalise && (
        <div className="barre-edition">
          <span className="aide-edition">
            Attrape l'en-tête d'un panneau pour le déplacer, son coin en bas à droite pour le redimensionner.
          </span>
          <div className="chips-panneaux">
            {PANNEAUX.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pastille-filtre${visible(p.id) ? ' active' : ''}`}
                aria-pressed={visible(p.id)}
                onClick={() => basculerPanneau(p.id)}
              >
                {p.nom}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="lien"
            onClick={() => { reinitialiserDisposition(); setMasques([]) }}
          >
            Disposition d'origine
          </button>
        </div>
      )}

      <BandeauRappels />

      <div className="tableau-grille" ref={containerRef}>
        {mounted && (
          <ResponsiveGridLayout
            width={width}
            layouts={{ lg: layout }}
            breakpoints={{ lg: 0 }}
            cols={{ lg: 12 }}
            rowHeight={26}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            compactor={verticalCompactor}
            /* On n'attrape que l'en-tête : sans ça, cocher une tâche
               déclencherait un déplacement du panneau. */
            dragConfig={{ enabled: personnalise, handle: '.panneau-tete' }}
            resizeConfig={{ enabled: personnalise }}
            onLayoutChange={enregistrerDisposition}
          >
            {layout.map((p) => (
              <div key={p.i} className="case-tableau">
                {contenu[p.i]}
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  )
}
