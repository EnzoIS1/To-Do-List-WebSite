import { toDateKey, fromDateKey, addDays, isToday } from '../../lib/dates'

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Le lundi de la semaine contenant `jour`. */
function lundiDe(jour) {
  const d = fromDateKey(jour)
  const decalage = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - decalage)
  return toDateKey(d)
}

/**
 * La bande de semaine du téléphone.
 *
 * Une grille mensuelle de 42 cases sur 390 px donne des cases de 50 px, où
 * aucun titre n'est lisible. On montre donc sept jours à la fois, avec des
 * pastilles pour la charge de chacun, et la grille du mois reste accessible
 * en plein écran quand on veut voir loin.
 */
export default function WeekStrip({ jourChoisi, taches, onJourClique, onSemaine }) {
  const debut = lundiDe(jourChoisi)
  const jours = Array.from({ length: 7 }, (_, i) => addDays(debut, i))

  const parJour = taches.reduce((acc, t) => {
    if (!t.due_date) return acc
    ;(acc[t.due_date] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="bande-semaine">
      <button
        type="button" className="bande-fleche"
        onClick={() => onSemaine(addDays(jourChoisi, -7))}
        aria-label="Semaine précédente"
      >←</button>

      <div className="bande-jours">
        {jours.map((jour, i) => {
          const duJour = parJour[jour] ?? []
          const restantes = duJour.filter((t) => !t.is_done).length
          const choisi = jour === jourChoisi

          return (
            <button
              key={jour}
              type="button"
              className={`bande-jour${choisi ? ' choisi' : ''}${isToday(jour) ? ' aujourdhui' : ''}`}
              aria-current={choisi ? 'date' : undefined}
              onClick={() => onJourClique(jour)}
            >
              <span className="bande-lettre">{LETTRES[i]}</span>
              <span className="bande-numero">{Number(jour.slice(8, 10))}</span>
              <span className="bande-points">
                {Array.from({ length: Math.min(restantes, 3) }, (_, k) => (
                  <span key={k} className="bande-point" />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button" className="bande-fleche"
        onClick={() => onSemaine(addDays(jourChoisi, 7))}
        aria-label="Semaine suivante"
      >→</button>
    </div>
  )
}
