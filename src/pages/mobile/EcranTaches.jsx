import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import TaskList from '../../components/tasks/TaskList'
import BarreCapture from '../../components/capture/BarreCapture'
import BandeauRappels from '../../components/rappels/BandeauRappels'
import { today, addDays, formatLong, formatRelative, isToday, isPast } from '../../lib/dates'

/**
 * L'écran principal du téléphone.
 *
 * Il ne montre plus seulement aujourd'hui : les flèches font défiler les
 * jours, ce qui permet de préparer demain ou de revenir sur hier sans passer
 * par le calendrier. Le bloc « En retard » n'apparaît que sur le jour courant,
 * là où il a un sens.
 */
export default function EcranTaches() {
  const {
    tasks, loading, creer, modifier, cocher, supprimer, choixCategories,
  } = useDonnees()

  const [jour, setJour] = useState(today())

  const duJour = tasks.filter((t) => t.due_date === jour)
  const faites = duJour.filter((t) => t.is_done).length
  const lendemain = addDays(jour, 1)
  const suivantes = tasks.filter((t) => t.due_date === lendemain && !t.is_done)
  const enRetard = isToday(jour)
    ? tasks.filter((t) => !t.is_done && t.due_date && isPast(t.due_date))
    : []

  return (
    <div className="ecran">
      <header className="ecran-tete colonne">
        <div className="ecran-titre">
          <div>
            <h1>Tâches</h1>
            <p className="sous-titre">
              {isToday(jour) ? formatLong(jour) : `${formatLong(jour)} · ${formatRelative(jour)}`}
            </p>
          </div>
          {duJour.length > 0 && (
            <div className="progression">
              <div className="progression-chiffre">{faites}/{duJour.length}</div>
              <div className="progression-barre">
                <div style={{ width: `${(faites / duJour.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="choix-jour">
          <button onClick={() => setJour(addDays(jour, -1))} aria-label="Jour précédent">←</button>
          <input
            type="date"
            value={jour}
            onChange={(e) => e.target.value && setJour(e.target.value)}
            aria-label="Jour à afficher"
          />
          <button onClick={() => setJour(addDays(jour, 1))} aria-label="Jour suivant">→</button>
          {!isToday(jour) && (
            <button className="bouton-doux" onClick={() => setJour(today())}>Aujourd'hui</button>
          )}
        </div>
      </header>

      <div className="ecran-corps">
        <BandeauRappels />

        {enRetard.length > 0 && (
          <>
            <h2 className="titre-bloc alerte">En retard · {enRetard.length}</h2>
            <TaskList
              taches={enRetard} loading={false} onCocher={cocher}
              onDater={modifier} vide=""
            />
          </>
        )}

        <h2 className="titre-bloc">À cocher · {duJour.length - faites}</h2>
        <TaskList
          taches={duJour} loading={loading} onCocher={cocher}
          onDater={modifier}
          vide={isToday(jour) ? "Rien de prévu aujourd'hui. Profites-en." : 'Rien de prévu ce jour-là.'}
        />

        {suivantes.length > 0 && (
          <>
            <h2 className="titre-bloc discret">
              {isToday(jour) ? 'Demain' : formatRelative(lendemain)} · {suivantes.length}
            </h2>
            <TaskList
              taches={suivantes} loading={false} onCocher={cocher}
              onDater={modifier} vide=""
            />
          </>
        )}
      </div>

      <BarreCapture onCreer={creer} categories={choixCategories} dateParDefaut={jour} />
    </div>
  )
}
