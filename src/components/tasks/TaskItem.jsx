import { formatRelative, isPast } from '../../lib/dates'

export default function TaskItem({ tache, etiquette, onCocher, onSupprimer }) {
  const enRetard = tache.due_date && !tache.is_done && isPast(tache.due_date)

  return (
    <li className={`tache${tache.is_done ? ' faite' : ''}${enRetard ? ' en-retard' : ''}`}>
      <label>
        <input
          type="checkbox"
          checked={tache.is_done}
          onChange={() => onCocher(tache)}
        />
        <span className="titre">{tache.title}</span>
      </label>

      {etiquette && <span className="etiquette">{etiquette}</span>}
      {tache.quantity && <span className="quantite">{tache.quantity}</span>}
      {tache.due_date && <span className="echeance">{formatRelative(tache.due_date)}</span>}

      <button className="supprimer" onClick={() => onSupprimer(tache.id)} aria-label="Supprimer">
        ✕
      </button>
    </li>
  )
}
