/**
 * Filtre de catégories du calendrier.
 *
 * Multi-sélection : aucune pastille active veut dire « tout afficher ». On
 * évite ainsi l'état vide accidentel où l'on décoche tout et où le calendrier
 * paraît cassé.
 */
export default function FiltreCategories({ categories, actives, onChange }) {
  if (categories.length === 0) return null

  const tout = actives.size === 0

  function basculer(id) {
    const suivant = new Set(actives)
    if (suivant.has(id)) suivant.delete(id)
    else suivant.add(id)
    onChange(suivant)
  }

  return (
    <div className="filtre-categories" role="group" aria-label="Filtrer par catégorie">
      <button
        type="button"
        className={`pastille-filtre${tout ? ' active' : ''}`}
        aria-pressed={tout}
        onClick={() => onChange(new Set())}
      >
        Tout
      </button>

      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`pastille-filtre${actives.has(c.id) ? ' active' : ''}`}
          style={{ '--teinte': c.color }}
          aria-pressed={actives.has(c.id)}
          onClick={() => basculer(c.id)}
        >
          <span className="pastille" />
          {c.name}
        </button>
      ))}
    </div>
  )
}

/**
 * Garde les tâches des catégories retenues, sous-catégories comprises.
 * Un ensemble vide laisse tout passer.
 */
export function filtrer(taches, actives, arbre) {
  if (actives.size === 0) return taches

  const familles = new Set()
  for (const racine of arbre) {
    if (!actives.has(racine.id)) continue
    familles.add(racine.id)
    for (const enfant of racine.enfants) familles.add(enfant.id)
  }
  for (const id of actives) familles.add(id)

  return taches.filter((t) => familles.has(t.category_id))
}
