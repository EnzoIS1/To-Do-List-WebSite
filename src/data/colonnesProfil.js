/**
 * Les colonnes de `profiles` que le site lit au chargement.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE LISTE VIT DANS SON PROPRE FICHIER
 *
 * Bug du 25 octobre 2026 : `reglages` (migration 0014) n'avait jamais été
 * ajouté au `select` de useProfil. Au chargement, `profil.reglages` valait
 * donc `undefined`, et tous les accesseurs de lib/reglages.js retombaient
 * sur leur défaut — sans erreur, puisqu'ils sont faits pour ça.
 *
 * Symptôme visible : la liste de courses réglée en « page dédiée »
 * disparaissait de la barre d'onglets à chaque réouverture (l'emplacement
 * lu valait « tableau », qui n'existe pas sur téléphone). Basculer la
 * fonctionnalité la faisait revenir, parce que l'`update(...).select()`
 * renvoie, lui, la ligne complète.
 *
 * Symptôme invisible, plus grave : toute écriture d'un réglage faite après
 * un chargement partait de `{}` au lieu des réglages réels, et écrasait
 * les autres clés en base (jours du résumé, catégorie de courses, …).
 *
 * La liste est isolée ici pour être testable sans Supabase :
 * `colonnesProfil.test.js` vérifie que tout champ lu sur le profil dans `src/`
 * y figure. Ajouter une colonne au profil = l'ajouter ici.
 * ─────────────────────────────────────────────────────────────────────
 */
export const COLONNES_PROFIL = [
  'id',
  'display_name',
  'resume_actif',
  'heure_resume',
  'fuseau',
  'mode_notif',
  'metier',
  'modules',
  'reglages',
]

export const SELECT_PROFIL = COLONNES_PROFIL.join(', ')
