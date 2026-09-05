import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import MonthGrid from '../../components/calendar/MonthGrid'
import FiltreCategories, { filtrer } from '../../components/calendar/FiltreCategories'
import TaskList from '../../components/tasks/TaskList'
import BarreCapture from '../../components/capture/BarreCapture'
import { today, monthOf, shiftMonth, formatMonth, formatLong } from '../../lib/dates'

/**
 * Le calendrier du téléphone : la grille du mois, et l'agenda du jour choisi
 * en dessous. La bande de semaine a été retirée — elle faisait double emploi
 * avec le choix du jour de l'écran Tâches.
 */
export default function EcranCalendrier() {
  const {
    tasks, loading, creer, modifier, cocher, supprimer,
    choixCategories, couleurDe, arbre,
  } = useDonnees()

  const [jourChoisi, setJourChoisi] = useState(today())
  const [mois, setMois] = useState(monthOf(today()))
  const [categoriesActives, setCategoriesActives] = useState(() => new Set())

  const visibles = filtrer(tasks, categoriesActives, arbre)
  const duJour = visibles.filter((t) => t.due_date === jourChoisi)

  function choisirJour(jour) {
    setJourChoisi(jour)
    const m = monthOf(jour)
    if (m.year !== mois.year || m.month !== mois.month) setMois(m)
  }

  return (
    <div className="ecran">
      <header className="ecran-tete colonne">
        <div className="ecran-titre">
          <h1>{formatMonth(mois)}</h1>
          <div className="nav-mois">
            <button onClick={() => setMois(shiftMonth(mois, -1))} aria-label="Mois précédent">←</button>
            <button className="bouton-doux" onClick={() => { setMois(monthOf(today())); setJourChoisi(today()) }}>
              Aujourd'hui
            </button>
            <button onClick={() => setMois(shiftMonth(mois, 1))} aria-label="Mois suivant">→</button>
          </div>
        </div>
        <FiltreCategories
          categories={arbre}
          actives={categoriesActives}
          onChange={setCategoriesActives}
        />
      </header>

      <div className="ecran-corps mois-plein">
        <MonthGrid
          mois={mois}
          taches={visibles}
          jourChoisi={jourChoisi}
          onJourClique={choisirJour}
          couleurDe={couleurDe}
          mode="barres"
        />

        <div className="agenda-jour">
          <h2 className="titre-bloc">{formatLong(jourChoisi)} · {duJour.length}</h2>
          <TaskList
            taches={duJour} loading={loading} onCocher={cocher}
            onDater={modifier}
            vide="Aucune tâche ce jour-là."
          />
        </div>
      </div>

      <BarreCapture
        onCreer={creer}
        categories={choixCategories}
        dateParDefaut={jourChoisi}
        placeholder={`Ajouter au ${Number(jourChoisi.slice(8, 10))}…`}
      />
    </div>
  )
}
