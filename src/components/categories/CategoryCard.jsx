import { useState } from 'react'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'

/**
 * Une catégorie racine et ses sous-catégories, en une seule carte.
 * Le petit bouton en haut à droite — celui du croquis — ouvre les réglages
 * de la carte : la couleur, et l'ajout d'une sous-catégorie.
 */
export default function CategoryCard({
  categorie, taches, loading, creer, cocher, supprimer, modifier, creerSousCategorie,
}) {
  const [reglagesOuverts, setReglagesOuverts] = useState(false)

  const idsDeLaFamille = [categorie.id, ...categorie.enfants.map((e) => e.id)]
  const siennes = taches.filter((t) => idsDeLaFamille.includes(t.category_id))
  const restantes = siennes.filter((t) => !t.is_done).length
  const nomSousCategorie = (id) =>
    id === categorie.id ? null : categorie.enfants.find((e) => e.id === id)?.name

  return (
    <section className="carte-categorie" style={{ '--teinte': categorie.color }}>
      <header className="carte-tete">
        <span className="pastille" />
        <h3>{categorie.name}</h3>
        <span className="compteur">{restantes}</span>
        <button
          type="button"
          className="bouton-reglage"
          aria-expanded={reglagesOuverts}
          aria-label={`Réglages de ${categorie.name}`}
          onClick={() => setReglagesOuverts((v) => !v)}
        >
          ⋯
        </button>
      </header>

      {reglagesOuverts && (
        <div className="carte-reglages">
          <label className="champ-couleur">
            Couleur
            <input
              type="color"
              value={categorie.color}
              onChange={(e) => modifier(categorie.id, { color: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="bouton-doux"
            onClick={() => creerSousCategorie(categorie)}
          >
            + Sous-catégorie
          </button>
        </div>
      )}

      <div className="carte-corps">
        <TaskList
          taches={siennes}
          loading={loading}
          onCocher={cocher}
          onSupprimer={supprimer}
          etiquette={(t) => nomSousCategorie(t.category_id)}
          vide="Aucune tâche dans cette catégorie."
        />
      </div>

      <QuickAdd onCreer={creer} categoryId={categorie.id} sansDate />
    </section>
  )
}
