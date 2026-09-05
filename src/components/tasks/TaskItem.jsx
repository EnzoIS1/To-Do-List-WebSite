import { useEffect, useRef, useState } from 'react'
import MenuTache from './MenuTache'
import { formatRelative, isPast } from '../../lib/dates'

/**
 * Une tâche.
 *
 * Le titre s'affiche EN ENTIER, sur plusieurs lignes s'il le faut. Il était
 * auparavant coupé par une ellipse : sur un téléphone de 390 px, « Réviser le
 * chapitre 3 sur les suites numériques » devenait « Réviser le chapit… », et
 * le seul moyen de lire la suite était de cocher la tâche pour la faire
 * disparaître. La place a été prise sur les réglages, regroupés dans le
 * bouton « ⋯ ».
 *
 * Le bouton de droite affiche l'échéance et permet de la changer d'un clic ;
 * tout le reste — catégorie, rappels, révisions, suppression — est dans le
 * menu, disponible même sur une tâche déjà cochée.
 */
export default function TaskItem({ tache, teinte, etiquette, badge, onCocher, onDater }) {
  const [editionDate, setEditionDate] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const champ = useRef(null)
  const boutonMenu = useRef(null)

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

      {badge && <span className="badge-revision">{badge}</span>}
      {etiquette && <span className="etiquette">{etiquette}</span>}
      {tache.quantity && <span className="quantite">{tache.quantity}</span>}

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

      <button
        ref={boutonMenu}
        type="button"
        className="bouton-reglage"
        aria-haspopup="menu"
        aria-expanded={menuOuvert}
        aria-label={`Réglages de ${tache.title}`}
        onClick={() => setMenuOuvert((v) => !v)}
      >
        ⋯
      </button>

      {menuOuvert && (
        <MenuTache tache={tache} ancre={boutonMenu} onFermer={() => setMenuOuvert(false)} />
      )}
    </li>
  )
}
