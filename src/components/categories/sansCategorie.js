/**
 * La catégorie qui n'en est pas une.
 *
 * Les tâches sans catégorie n'apparaissaient dans la liste des catégories
 * nulle part — par définition, puisque cette liste vient de la table
 * `categories`. Elles n'étaient visibles que dans la prise de note, et
 * encore : seulement celles qui n'ont pas non plus de date. Une tâche
 * datée mais non rangée n'avait donc aucun endroit où se voir.
 *
 * D'où cette entrée, posée à la fin de la liste. Elle se comporte comme
 * une catégorie à l'écran, mais n'existe pas en base : pas de renommage,
 * pas de couleur, pas de suppression — d'où le drapeau `virtuelle` que
 * <CategoryCard> reçoit et qui retire le menu « ⋯ ».
 *
 * L'identifiant ne peut entrer en collision avec un vrai : les catégories
 * ont des UUID, jamais cette chaîne.
 */
export const SANS_CATEGORIE = {
  id: '__sans-categorie__',
  name: 'Sans catégorie',
  color: 'var(--discret)',
  enfants: [],
}

/** Les tâches qu'elle rassemble : celles qui ne sont rangées nulle part. */
export const tachesSansCategorie = (taches) => taches.filter((t) => !t.category_id)
