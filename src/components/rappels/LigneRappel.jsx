import { useDonnees } from '../../data/DonneesProvider'
import { formatLong, formatRelative, isPast, isToday } from '../../lib/dates'
import { libelleRappel } from '../../lib/rappels'

/**
 * Un rappel, sur une ligne — la même sur ordinateur et sur téléphone.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QU'ELLE DIT, ET DANS QUEL ORDRE
 *
 * 1. L'INTITULÉ, en tête : « La veille », « 3 jours avant ». C'est ce
 *    qu'on avait demandé, donc ce qu'on reconnaît. La page n'affichait
 *    avant qu'une date brute, qui obligeait à retrouver l'échéance et à
 *    faire la soustraction de tête.
 * 2. Le titre de la tâche, en gros.
 * 3. Quand le rappel tombe, et quand la tâche est à faire.
 *
 * Trois actions, et pas une de plus : cocher la tâche, écarter le rappel
 * (il reste en base, `seen_at` est renseigné), retirer le rappel pour de
 * bon. « Écarter » range le rappel du jour ; « Retirer » supprime le
 * réglage lui-même — deux choses différentes que la page confondait.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function LigneRappel({ rappel, tache, compact = false }) {
  const {
    cocher, marquerRappelVu, supprimerRappel, basculerRappelAuto, couleurDe,
  } = useDonnees()

  const enRetard = isPast(rappel.remind_on) && !isToday(rappel.remind_on)

  // Un rappel automatique ne se supprime pas : le trigger de la base le
  // repose à la modification suivante. C'est `rappel_auto` qui porte le refus.
  const retirer = () => (rappel.auto
    ? basculerRappelAuto(tache, false)
    : supprimerRappel(rappel.id))

  return (
    <li
      className={`rappel${enRetard ? ' en-retard' : ''}${compact ? ' compact' : ''}`}
      style={{ '--teinte': couleurDe(tache) }}
    >
      <span className="rappel-pastille" aria-hidden="true" />

      <div className="rappel-texte">
        <span className="rappel-intitule">
          {libelleRappel(rappel.remind_on, tache.due_date)}
          {rappel.auto && <em> · automatique</em>}
        </span>
        <strong>{tache.title}</strong>
        <span className="rappel-echeance">
          {formatLong(rappel.remind_on)}
          {tache.due_date && ` · à faire ${formatRelative(tache.due_date)}`}
        </span>
      </div>

      <div className="rappel-actions">
        <button type="button" className="bouton-doux" onClick={() => cocher(tache)}>
          Fait
        </button>
        {!rappel.seen_at && (
          <button
            type="button" className="lien"
            onClick={() => marquerRappelVu(rappel.id)}
            title="Ranger ce rappel sans toucher à la tâche"
          >
            Écarter
          </button>
        )}
        <button type="button" className="lien danger" onClick={retirer}
          title="Supprimer le rappel lui-même">
          Retirer
        </button>
      </div>
    </li>
  )
}
