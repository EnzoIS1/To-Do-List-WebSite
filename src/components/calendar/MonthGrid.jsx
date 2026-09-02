import { monthGrid, monthOf, isToday } from '../../lib/dates'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const POINTS_MAX = 4

/**
 * Grille mensuelle de 6 semaines. Chaque case porte les tâches dont
 * due_date vaut ce jour — la comparaison est une simple égalité de chaînes,
 * puisque la colonne est un `date` et non un horodatage.
 *
 * Au repos, une case montre des PASTILLES de couleur, pas des titres : les
 * titres se lisaient déjà dans le panneau du jour et dans la catégorie, ce
 * qui faisait apparaître la même tâche trois fois à l'écran. La case ouverte,
 * elle, affiche la liste complète.
 */
export default function MonthGrid({ mois, taches, jourChoisi, onJourClique, couleurDe }) {
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
          const faites = duJour.filter((t) => t.is_done).length
          const choisi = jour === jourChoisi
          const horsMois = monthOf(jour).month !== mois.month

          const classes = [
            'case',
            horsMois ? 'hors-mois' : '',
            isToday(jour) ? 'aujourdhui' : '',
            choisi ? 'selectionne' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={jour}
              className={classes}
              aria-current={choisi ? 'date' : undefined}
              aria-label={`${jour} — ${duJour.length} tâche(s)`}
              onClick={() => onJourClique?.(jour)}
            >
              <span className="tete-case">
                <span className="numero">{Number(jour.slice(8, 10))}</span>
                {duJour.length > 0 && (
                  <span
                    className={`compteur-jour${faites === duJour.length ? ' tout-fait' : ''}`}
                    title={`${faites} faite(s) sur ${duJour.length}`}
                  >
                    {faites}/{duJour.length}
                  </span>
                )}
              </span>

              {choisi ? (
                duJour.map((t) => (
                  <span
                    key={t.id}
                    className={`mini-tache${t.is_done ? ' faite' : ''}`}
                    style={couleurDe ? { '--teinte': couleurDe(t) } : undefined}
                  >
                    {t.title}
                  </span>
                ))
              ) : (
                duJour.length > 0 && (
                  <span className="pastilles-jour">
                    {duJour.slice(0, POINTS_MAX).map((t) => (
                      <span
                        key={t.id}
                        className={`point-tache${t.is_done ? ' faite' : ''}`}
                        style={couleurDe ? { '--teinte': couleurDe(t) } : undefined}
                      />
                    ))}
                    {duJour.length > POINTS_MAX && (
                      <span className="reste">+{duJour.length - POINTS_MAX}</span>
                    )}
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
