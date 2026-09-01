import { monthGrid, monthOf, isToday } from '../../lib/dates'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * Grille mensuelle de 6 semaines. Chaque case porte les tâches dont
 * due_date vaut ce jour — d'où l'intérêt d'avoir stocké un `date` et non
 * un horodatage : la comparaison est une simple égalité de chaînes.
 */
export default function MonthGrid({ mois, taches, onJourClique }) {
  const jours = monthGrid(mois.year, mois.month)

  const parJour = taches.reduce((acc, t) => {
    if (!t.due_date) return acc
    ;(acc[t.due_date] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="calendrier">
      <div className="entete-jours">
        {JOURS.map((j, i) => <span key={i}>{j}</span>)}
      </div>

      <div className="grille">
        {jours.map((jour) => {
          const duJour = parJour[jour] ?? []
          const horsMois = monthOf(jour).month !== mois.month
          return (
            <button
              key={jour}
              className={`case${horsMois ? ' hors-mois' : ''}${isToday(jour) ? ' aujourdhui' : ''}`}
              onClick={() => onJourClique?.(jour)}
            >
              <span className="numero">{Number(jour.slice(8, 10))}</span>
              {duJour.slice(0, 3).map((t) => (
                <span key={t.id} className="mini-tache">{t.title}</span>
              ))}
              {duJour.length > 3 && <span className="reste">+{duJour.length - 3}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
