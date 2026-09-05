import { useState } from 'react'
import CategoryCard from './CategoryCard'
import { SANS_CATEGORIE, tachesSansCategorie } from './sansCategorie'

/**
 * La colonne de droite, en accordéon : une seule catégorie ouverte à la fois.
 *
 * C'est ce qui supprime les défilements imbriqués relevés pendant la revue —
 * avant, chaque carte défilait à l'intérieur d'une colonne qui défilait
 * elle-même. Les catégories fermées ne montrent que leur nom et leur compte.
 */
export default function CategoryColumn({
  arbre, taches, loading, creer, cocher, supprimer, modifier, dater,
  creerCategorie, creerSousCategorie, supprimerCategorie,
}) {
  /**
   * `undefined` = l'utilisateur n'a pas encore choisi, on ouvre la première
   * catégorie ; `null` = il a tout replié volontairement.
   *
   * ⚠️ Ne PAS écrire `useState(arbre[0]?.id)` : au premier rendu les données
   * ne sont pas encore chargées, `arbre` est vide, et l'état resterait bloqué
   * sur `undefined` sans jamais s'ouvrir. C'est exactement le piège qui avait
   * déjà fait partir les tâches du calendrier à la mauvaise date.
   */
  const [choix, setChoix] = useState(undefined)
  const ouverte = choix === undefined ? (arbre[0]?.id ?? null) : choix
  const setOuverte = setChoix

  return (
    <div className="colonne-categories">
      <div className="pile-categories">
        {arbre.length === 0 && (
          <p className="etat-vide">Aucune catégorie pour l'instant. Crée la première ci-dessous.</p>
        )}

        {arbre.map((categorie) => {
          const ids = [categorie.id, ...categorie.enfants.map((e) => e.id)]
          const restantes = taches.filter((t) => ids.includes(t.category_id) && !t.is_done).length
          const estOuverte = ouverte === categorie.id

          if (estOuverte) {
            return (
              <CategoryCard
                key={categorie.id}
                categorie={categorie}
                taches={taches}
                loading={loading}
                creer={creer}
                cocher={cocher}
                supprimer={supprimer}
                modifier={modifier}
                dater={dater}
                creerSousCategorie={creerSousCategorie}
                supprimerCategorie={supprimerCategorie}
                onReplier={() => setOuverte(null)}
              />
            )
          }

          return (
            <button
              key={categorie.id}
              type="button"
              className="categorie-repliee"
              style={{ '--teinte': categorie.color }}
              onClick={() => setOuverte(categorie.id)}
            >
              <span className="pastille" />
              <span className="categorie-nom">{categorie.name}</span>
              <span className="compteur">{restantes}</span>
            </button>
          )
        })}

        {/* Toujours en dernier : ce qui n'est rangé nulle part. */}
        {ouverte === SANS_CATEGORIE.id ? (
          <CategoryCard
            virtuelle
            categorie={SANS_CATEGORIE}
            taches={taches}
            loading={loading}
            cocher={cocher}
            dater={dater}
            onReplier={() => setOuverte(null)}
          />
        ) : (
          <button
            type="button"
            className="categorie-repliee sans-categorie"
            style={{ '--teinte': SANS_CATEGORIE.color }}
            onClick={() => setOuverte(SANS_CATEGORIE.id)}
          >
            <span className="pastille" />
            <span className="categorie-nom">{SANS_CATEGORIE.name}</span>
            <span className="compteur">
              {tachesSansCategorie(taches).filter((t) => !t.is_done).length}
            </span>
          </button>
        )}
      </div>

      <button type="button" className="creer-categorie" onClick={creerCategorie}>
        + Créer une nouvelle catégorie
      </button>
    </div>
  )
}
