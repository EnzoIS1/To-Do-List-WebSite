import { useRef, useState } from 'react'
import TaskList from '../tasks/TaskList'
import MenuFlottant from '../ui/MenuFlottant'

/**
 * Une catégorie racine et ses sous-catégories, en une seule carte.
 *
 * Le menu du bouton « ⋯ » est rendu par <MenuFlottant>, qui le sort de la
 * carte via un portail — voir le commentaire de ce composant : posé à
 * l'intérieur, il pouvait se retrouver découpé par l'`overflow: hidden` de
 * la carte selon ce que le navigateur conservait de l'animation d'ouverture.
 * Sur téléphone, il devient une feuille en bas de l'écran.
 *
 * Le renommage se fait dans un champ du menu, plus par window.prompt() :
 * une boîte système par-dessus une page web est brutale sur téléphone, et
 * elle efface le nom actuel dès qu'on commence à taper sur certains claviers.
 */
export default function CategoryCard({
  categorie, taches, loading, cocher, modifier, dater,
  creerSousCategorie, supprimerCategorie, onReplier, virtuelle = false,
}) {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [nom, setNom] = useState(categorie.name)
  const bouton = useRef(null)

  const idsDeLaFamille = [categorie.id, ...categorie.enfants.map((e) => e.id)]
  const siennes = virtuelle
    ? taches.filter((t) => !t.category_id)
    : taches.filter((t) => idsDeLaFamille.includes(t.category_id))

  /*
   * Les tâches finies sont SÉPARÉES, pas mélangées.
   *
   * Le tri les envoyait déjà en bas de la liste, mais rien ne marquait la
   * frontière : une catégorie de vingt lignes dont quinze étaient cochées
   * ressemblait à une catégorie de vingt lignes à faire, et il fallait
   * lire les titres barrés un par un pour trouver où commençait le reste.
   * Le trait et le compte le disent d'un coup d'œil.
   */
  const enCours = siennes.filter((t) => !t.is_done)
  const terminees = siennes.filter((t) => t.is_done)
  const restantes = enCours.length
  const nomSousCategorie = (id) =>
    id === categorie.id ? null : categorie.enfants.find((e) => e.id === id)?.name

  function ouvrir() {
    setNom(categorie.name)
    setMenuOuvert((v) => !v)
  }

  function renommer() {
    const propre = nom.trim()
    if (propre && propre !== categorie.name) modifier(categorie.id, { name: propre })
  }

  function demanderSuppression() {
    setMenuOuvert(false)
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

        {!virtuelle && (
        <button
          ref={bouton}
          type="button"
          className="bouton-reglage"
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
          aria-label={`Réglages de ${categorie.name}`}
          onClick={ouvrir}
        >
          ⋯
        </button>
        )}
      </header>

      {!virtuelle && menuOuvert && (
        <MenuFlottant ancre={bouton} titre={categorie.name} onFermer={() => setMenuOuvert(false)}>
          <div className="menu-corps">
            <label className="menu-champ">
              <span>Nom</span>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                onBlur={renommer}
                onKeyDown={(e) => { if (e.key === 'Enter') { renommer(); e.currentTarget.blur() } }}
              />
            </label>

            <label className="menu-champ">
              <span>Couleur</span>
              <input
                type="color"
                value={categorie.color}
                onChange={(e) => modifier(categorie.id, { color: e.target.value })}
              />
            </label>

            <button
              type="button" role="menuitem" className="menu-ligne"
              onClick={() => { setMenuOuvert(false); creerSousCategorie(categorie) }}
            >
              Ajouter une sous-catégorie
            </button>

            <hr className="menu-trait" />

            <button
              type="button" role="menuitem" className="menu-ligne danger"
              onClick={demanderSuppression}
            >
              Supprimer la catégorie
            </button>
          </div>
        </MenuFlottant>
      )}

      <div className="carte-corps">
        <TaskList
          taches={enCours}
          loading={loading}
          onCocher={cocher}
          onDater={dater}
          etiquette={(t) => nomSousCategorie(t.category_id)}
          vide={virtuelle
            ? 'Toutes les tâches sont rangées dans une catégorie.'
            : 'Aucune tâche à faire dans cette catégorie.'}
        />

        {terminees.length > 0 && (
          <>
            <div className="separateur-terminees">
              <span>Terminées · {terminees.length}</span>
            </div>
            <TaskList
              taches={terminees}
              loading={false}
              onCocher={cocher}
              onDater={dater}
              etiquette={(t) => nomSousCategorie(t.category_id)}
              vide=""
            />
          </>
        )}
      </div>

    </section>
  )
}
