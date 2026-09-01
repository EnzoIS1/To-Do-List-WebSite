import { monthGrid, monthOf, isToday } from '../../lib/dates'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Nombre de tâches visibles dans une case au repos. Au-delà : « +2 tâches ». */
const APERCU = 3

/**
 * Grille mensuelle de 6 semaines. Chaque case porte les tâches dont
 * due_date vaut ce jour — d'où l'intérêt d'avoir stocké un `date` et non
 * un horodatage : la comparaison est une simple égalité de chaînes.
 *
 * En haut à droite de chaque case, un compteur « faites / total » donne
 * l'avancement du jour d'un coup d'œil.
 *
 * La case sélectionnée s'agrandit vers le bas et passe par-dessus les
 * suivantes pour montrer sa liste entière (voir `.case.selectionne` dans
 * global.css : align-self: start + height: auto + z-index).
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
          const visibles = choisi ? duJour : duJour.slice(0, APERCU)
          const cachees = duJour.length - visibles.length

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
              onClick={() => onJourClique?.(jour)}
            >
              <span className="tete-case">
                <span className="numero">{Number(jour.slice(8, 10))}</span>
                {duJour.length > 0 && (
                  <span
                    className={`compteur-jour${faites === duJour.length ? ' tout-fait' : ''}`}
                    title={`${faites} tâche(s) faite(s) sur ${duJour.length}`}
                  >
                    {faites}/{duJour.length}
                  </span>
                )}
              </span>

              {visibles.map((t) => (
                <span
                  key={t.id}
                  className={`mini-tache${t.is_done ? ' faite' : ''}`}
                  style={couleurDe ? { '--teinte': couleurDe(t) } : undefined}
                >
                  {t.title}
                </span>
              ))}

              {cachees > 0 && (
                <span className="reste">
                  +{cachees} {cachees > 1 ? 'tâches' : 'tâche'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
