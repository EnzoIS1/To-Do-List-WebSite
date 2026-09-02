import { useEffect, useRef, useState } from 'react'
import { formatRelative, isPast } from '../../lib/dates'

/**
 * Une tâche. Le bouton de droite affiche l'échéance et permet de la changer :
 * un clic ouvre un champ date, et le choix est enregistré immédiatement.
 * Une tâche sans date affiche un discret « + date » plutôt que rien du tout.
 */
export default function TaskItem({ tache, teinte, etiquette, onCocher, onSupprimer, onDater, categories }) {
  const [editionDate, setEditionDate] = useState(false)
  const champ = useRef(null)

  useEffect(() => {
    if (editionDate) champ.current?.focus()
  }, [editionDate])

  const enRetard = tache.due_date && !tache.is_done && isPast(tache.due_date)

  function changerDate(valeur) {
    setEditionDate(false)
    const nouvelle = valeur || null
    if (nouvelle !== tache.due_date) onDater?.(tache.id, { due_date: nouvelle })
  }

  return (
    <li
      className={`tache${tache.is_done ? ' faite' : ''}${enRetard ? ' en-retard' : ''}`}
      style={teinte ? { '--teinte': teinte } : undefined}
    >
      <label>
        {/*
          La case à cocher du navigateur est conservée puis masquée, et
          habillée par le <span>. Un cercle redessiné avec un simple <div>
          perdrait le clavier, la touche Espace et les lecteurs d'écran.
        */}
        <span className="coche">
          <input
            type="checkbox"
            checked={tache.is_done}
            onChange={() => onCocher(tache)}
          />
          <span className="marque" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M2.5 8.4l3.6 3.6L13.5 4.4" />
            </svg>
          </span>
        </span>
        <span className="titre">{tache.title}</span>
      </label>

      {etiquette && <span className="etiquette">{etiquette}</span>}
      {tache.quantity && <span className="quantite">{tache.quantity}</span>}

      {categories && (
        <select
          className="choix-categorie"
          value={tache.category_id ?? ''}
          onChange={(e) => onDater?.(tache.id, { category_id: e.target.value || null })}
          aria-label={`Catégorie de ${tache.title}`}
        >
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.chemin ?? c.name}</option>
          ))}
        </select>
      )}

      {onDater && (
        editionDate ? (
          <input
            ref={champ}
            type="date"
            className="champ-echeance"
            defaultValue={tache.due_date ?? ''}
            onBlur={(e) => changerDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') changerDate(e.target.value)
              if (e.key === 'Escape') setEditionDate(false)
            }}
            aria-label={`Échéance de ${tache.title}`}
          />
        ) : (
          <button
            type="button"
            className={`bouton-echeance${tache.due_date ? '' : ' vide'}`}
            onClick={() => setEditionDate(true)}
            title="Changer l'échéance"
          >
            {tache.due_date ? formatRelative(tache.due_date) : '+ date'}
          </button>
        )
      )}

      {!onDater && tache.due_date && (
        <span className="echeance">{formatRelative(tache.due_date)}</span>
      )}

      <button className="supprimer" onClick={() => onSupprimer(tache.id)} aria-label="Supprimer">
        ✕
      </button>
    </li>
  )
}
