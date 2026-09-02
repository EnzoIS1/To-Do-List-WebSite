import { useDonnees } from '../../data/DonneesProvider'
import TaskList from '../../components/tasks/TaskList'
import BarreCapture from '../../components/capture/BarreCapture'
import { today, formatLong, titreDuMoment, isPast } from '../../lib/dates'

/**
 * L'écran d'ouverture du téléphone.
 *
 * Il répond à la question du soir : qu'est-ce qui reste, qu'est-ce que j'ai
 * fait, qu'est-ce qui arrive demain. D'où les trois blocs, dans cet ordre.
 */
export default function EcranSoir() {
  const {
    tasks, loading, creer, modifier, cocher, supprimer, choixCategories,
  } = useDonnees()

  const jour = today()
  const enRetard = tasks.filter((t) => !t.is_done && t.due_date && isPast(t.due_date))
  const duJour = tasks.filter((t) => t.due_date === jour)
  const demain = tasks.filter((t) => t.due_date === addUnJour(jour) && !t.is_done)
  const faites = duJour.filter((t) => t.is_done).length

  return (
    <div className="ecran">
      <header className="ecran-tete">
        <div>
          <h1>{titreDuMoment()}</h1>
          <p className="sous-titre">{formatLong(jour)}</p>
        </div>
        {duJour.length > 0 && (
          <div className="progression">
            <div className="progression-chiffre">{faites}/{duJour.length}</div>
            <div className="progression-barre">
              <div style={{ width: `${(faites / duJour.length) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="ecran-corps">
        {enRetard.length > 0 && (
          <>
            <h2 className="titre-bloc alerte">En retard · {enRetard.length}</h2>
            <TaskList
              taches={enRetard} loading={false} onCocher={cocher}
              onSupprimer={supprimer} onDater={modifier} vide=""
            />
          </>
        )}

        <h2 className="titre-bloc">À cocher · {duJour.length - faites}</h2>
        <TaskList
          taches={duJour} loading={loading} onCocher={cocher}
          onSupprimer={supprimer} onDater={modifier}
          vide="Rien de prévu aujourd'hui. Profites-en."
        />

        {demain.length > 0 && (
          <>
            <h2 className="titre-bloc discret">Demain · {demain.length}</h2>
            <TaskList
              taches={demain} loading={false} onCocher={cocher}
              onSupprimer={supprimer} onDater={modifier} vide=""
            />
          </>
        )}
      </div>

      <BarreCapture
        onCreer={creer}
        categories={choixCategories}
        dateParDefaut={jour}
      />
    </div>
  )
}

/** Petit utilitaire local : le lendemain d'une clé de jour. */
function addUnJour(cle) {
  const [y, m, d] = cle.split('-').map(Number)
  const date = new Date(y, m - 1, d + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
