import CategoryCard from './CategoryCard'

/**
 * La colonne de droite du croquis. Toutes les catégories y sont affichées les
 * unes sous les autres, et la colonne défile s'il y en a beaucoup — aucune
 * catégorie ne peut être oubliée faute d'emplacement libre.
 * Le bouton de création reste collé en bas, toujours atteignable.
 */
export default function CategoryColumn({
  arbre, taches, loading, creer, cocher, supprimer, modifier, dater,
  creerCategorie, creerSousCategorie, supprimerCategorie,
}) {
  return (
    <div className="colonne-categories">
      <div className="pile-categories">
        {arbre.length === 0 && (
          <p className="etat-vide">
            Aucune catégorie pour l'instant. Crée la première ci-dessous.
          </p>
        )}

        {arbre.map((categorie) => (
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
          />
        ))}
      </div>

      <button type="button" className="creer-categorie" onClick={creerCategorie}>
        + Créer une nouvelle catégorie
      </button>
    </div>
  )
}
