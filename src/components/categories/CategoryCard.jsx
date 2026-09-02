import { useEffect, useRef, useState } from 'react'
import TaskList from '../tasks/TaskList'

/**
 * Une catégorie racine et ses sous-catégories, en une seule carte.
 *
 * Le bouton « ⋯ » du croquis ouvre un menu flottant qui passe par-dessus le
 * reste — et non plus un bandeau qui pousse le contenu vers le bas. Il se
 * ferme au clic à côté, à la touche Échap, et rend le focus au bouton.
 */
export default function CategoryCard({
  categorie, taches, loading, cocher, supprimer, modifier, dater,
  creerSousCategorie, supprimerCategorie, onReplier,
}) {
  const [menu, setMenu] = useState(null)   // null = fermé, sinon { top, right }
  const menuRef = useRef(null)
  const bouton = useRef(null)

  /**
   * Le menu est positionné en `fixed`, à partir des coordonnées du bouton.
   * C'est ce qui lui permet de passer devant tout le reste : la carte et la
   * colonne ont chacune un `overflow` qui découperait un menu positionné
   * en absolu à l'intérieur.
   */
  function ouvrir() {
    if (menu) { setMenu(null); return }
    const r = bouton.current.getBoundingClientRect()
    setMenu({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  useEffect(() => {
    if (!menu) return
    const clicDehors = (e) => {
      if (!menuRef.current?.contains(e.target) && !bouton.current?.contains(e.target)) {
        setMenu(null)
      }
    }
    const touche = (e) => {
      if (e.key === 'Escape') { setMenu(null); bouton.current?.focus() }
    }
    // Un menu en position fixe ne suit pas le défilement : on le referme.
    const fermer = () => setMenu(null)
    document.addEventListener('mousedown', clicDehors)
    document.addEventListener('keydown', touche)
    window.addEventListener('resize', fermer)
    document.addEventListener('scroll', fermer, true)
    return () => {
      document.removeEventListener('mousedown', clicDehors)
      document.removeEventListener('keydown', touche)
      window.removeEventListener('resize', fermer)
      document.removeEventListener('scroll', fermer, true)
    }
  }, [menu])

  const idsDeLaFamille = [categorie.id, ...categorie.enfants.map((e) => e.id)]
  const siennes = taches.filter((t) => idsDeLaFamille.includes(t.category_id))
  const restantes = siennes.filter((t) => !t.is_done).length
  const nomSousCategorie = (id) =>
    id === categorie.id ? null : categorie.enfants.find((e) => e.id === id)?.name

  function demanderSuppression() {
    setMenu(null)
    const compte = siennes.length
    const ok = window.confirm(
      `Supprimer la catégorie « ${categorie.name} » ?\n\n` +
      (compte > 0
        ? `Ses ${compte} tâche(s) ne sont pas supprimées : elles se retrouvent sans catégorie et réapparaissent dans la prise de note si elles n'ont pas de date.`
        : 'Elle ne contient aucune tâche.')
    )
    if (ok) supprimerCategorie(categorie)
  }

  return (
    <section className="carte-categorie" style={{ '--teinte': categorie.color }}>
      <header className="carte-tete">
        <span className="pastille" />
        <h3>{categorie.name}</h3>
        <span className="compteur">{restantes}</span>
        {onReplier && (
          <button type="button" className="bouton-reglage" onClick={onReplier} aria-label="Replier">–</button>
        )}

        <button
          ref={bouton}
          type="button"
          className="bouton-reglage"
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          aria-label={`Réglages de ${categorie.name}`}
          onClick={ouvrir}
        >
          ⋯
        </button>

        {menu && (
          <div
            className="menu-flottant"
            role="menu"
            ref={menuRef}
            style={{ top: menu.top, right: menu.right }}
          >
            <label className="menu-ligne champ-couleur">
              <span>Couleur</span>
              <input
                type="color"
                value={categorie.color}
                onChange={(e) => modifier(categorie.id, { color: e.target.value })}
              />
            </label>

            <button
              type="button" role="menuitem" className="menu-ligne"
              onClick={() => { setMenu(null); creerSousCategorie(categorie) }}
            >
              Ajouter une sous-catégorie
            </button>

            <button
              type="button" role="menuitem" className="menu-ligne"
              onClick={() => {
                const nom = window.prompt('Renommer la catégorie', categorie.name)
                if (nom?.trim()) modifier(categorie.id, { name: nom.trim() })
                setMenu(null)
              }}
            >
              Renommer
            </button>

            <hr className="menu-trait" />

            <button
              type="button" role="menuitem" className="menu-ligne danger"
              onClick={demanderSuppression}
            >
              Supprimer la catégorie
            </button>
          </div>
        )}
      </header>

      <div className="carte-corps">
        <TaskList
          taches={siennes}
          loading={loading}
          onCocher={cocher}
          onSupprimer={supprimer}
          onDater={dater}
          etiquette={(t) => nomSousCategorie(t.category_id)}
          vide="Aucune tâche dans cette catégorie."
        />
      </div>

    </section>
  )
}
