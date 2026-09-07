import { useDonnees } from '../../data/DonneesProvider'
import { libelleRappel } from '../../lib/rappels'

/**
 * Les rappels d'un jour précis, sous l'agenda de ce jour.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUE ÇA RÉPARE
 *
 * Le calendrier posait une clochette sur les jours qui portent un rappel,
 * et c'était tout : on savait qu'il y avait un rappel, jamais lequel. Or
 * un rappel n'a de sens qu'attaché à sa tâche — « rappel jeudi » ne dit
 * rien, « la veille du contrôle de maths » dit tout.
 *
 * Ce bloc n'apparaît que les jours qui en portent : le reste du temps, il
 * n'occupe pas une ligne pour annoncer qu'il n'a rien à annoncer.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function RappelsDuJour({ jour }) {
  const { rappelsParJour, couleurDe } = useDonnees()
  const lignes = rappelsParJour?.get(jour) ?? []

  if (lignes.length === 0) return null

  return (
    <div className="rappels-du-jour">
      <h3 className="titre-bloc">
        <span className="cloche-titre" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
            <path d="M13.7 19a2 2 0 0 1-3.4 0" />
          </svg>
        </span>
        Rappels · {lignes.length}
      </h3>

      <ul className="liste-rappels-jour">
        {lignes.map(({ rappel, tache }) => (
          <li key={rappel.id} style={{ '--teinte': couleurDe(tache) }}>
            <span className="pastille" aria-hidden="true" />
            <span className="rappel-jour-texte">
              <strong>{tache.title}</strong>
              <span>
                {libelleRappel(rappel.remind_on, tache.due_date)}
                {rappel.auto && ' · automatique'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
