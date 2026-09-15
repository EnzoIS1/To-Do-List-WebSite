/**
 * Le catalogue des fonctionnalités, et les métiers qui les débloquent.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * La première version faisait des courses, des répétitions et des notes
 * des modules débrayables. C'était une erreur : ce ne sont pas des
 * options, c'est le produit. Les rendre débrayables ajoutait un réglage
 * que personne n'ouvrirait, et une façon de casser son propre site par
 * mégarde.
 *
 * Le métier n'éteint donc plus rien — il AJOUTE. Ce qui est marqué
 * `base` est toujours là, pour tout le monde, sans réglage. Le reste
 * s'allume selon le métier, et reste réglable une par une.
 *
 * POURQUOI UN CATALOGUE SÉPARÉ DE LA PAGE DE RÉGLAGES
 *
 * Deux besoins qu'on confondait : DÉCOUVRIR ce qui existe et choisir ce
 * qu'on veut, d'un côté ; RÉGLER le détail de ce qu'on a choisi, de
 * l'autre. Tout empiler dans les paramètres rendait la page
 * interminable à mesure qu'on ajoutait des fonctionnalités.
 *
 * Le catalogue vit donc sur sa propre page — avec une explication par
 * fonctionnalité, ce qui est aussi la seule façon qu'on a de dire à quoi
 * elles servent — et les paramètres ne gardent que la configuration de
 * celles qui sont actives.
 *
 * AJOUTER UNE FONCTIONNALITÉ
 *
 * Une entrée ici, et un test de `fonctionActive(id)` là où elle
 * s'affiche. Aucune migration : la base ne vérifie que la forme de
 * `profiles.modules` (un objet de booléens), jamais la liste.
 * ─────────────────────────────────────────────────────────────────────
 */

export const METIERS = [
  { id: 'etudiant', nom: 'Étudiant', aide: 'Cours, devoirs, examens.' },
  { id: 'salarie', nom: 'Salarié', aide: 'Des tâches à échéance, des choses confiées à d\'autres.' },
  { id: 'cadre', nom: 'Cadre / manager', aide: 'Du suivi, des points à faire avec son équipe.' },
  { id: 'independant', nom: 'Chef d\'entreprise', aide: 'Des échéances qui reviennent, des relances.' },
]

/**
 * Le catalogue.
 *
 * ⚠️ RÈGLE : on ne liste ici que ce qui EXISTE. Une fonctionnalité
 * annoncée et non écrite est une promesse affichée en permanence à
 * l'utilisateur — ça transforme une page utile en liste d'attente.
 */
export const FONCTIONNALITES = [
  /* ── La base : toujours là, aucun réglage ── */
  {
    id: 'taches', nom: 'Tâches et catégories', base: true,
    resume: 'Le cœur du site : des tâches, rangées, datées, cochées.',
    detail: 'Des catégories à deux niveaux, un tri configurable, et les tâches terminées séparées des autres.',
  },
  {
    id: 'calendrier', nom: 'Calendrier', base: true,
    resume: 'Le mois en un coup d\'œil, avec les tâches posées dessus.',
    detail: 'Filtrable par catégorie. Les jours qui portent un rappel sont marqués, et on voit de quelle tâche il s\'agit.',
  },
  {
    id: 'rappels', nom: 'Rappels et notifications', base: true,
    resume: 'Un rappel la veille, automatiquement, et un résumé le matin.',
    detail: 'Les rappels s\'affichent en haut du tableau de bord. Si les notifications sont activées, un résumé part à 7 h.',
  },
  {
    id: 'courses', nom: 'Liste de courses', base: true,
    resume: 'Un panneau à part pour les articles à acheter.',
    detail: 'Ce sont des tâches ordinaires, sans échéance, rangées dans la catégorie Courses.',
  },
  {
    id: 'repetitions', nom: 'Répétitions', base: true,
    resume: 'Faire revenir une tâche ou un article tous les jours, toutes les semaines, tous les mois.',
    detail: 'Depuis le menu « ⋯ » d\'une tâche. Avec ou sans date de fin, avec ou sans échéance sur chaque occurrence.',
  },
  {
    id: 'notes', nom: 'Prise de notes', base: true,
    resume: 'Un endroit pour écrire ce qui n\'est pas encore une tâche.',
    detail: 'Une note se transforme en tâche quand elle est prête, sans être ressaisie.',
  },

  /* ── Étudiant ──
     ⚠️ Le compte à rebours d'examen et la charge par catégorie ont été
     retirés de cette liste : ils étaient décrits ici alors qu'ils
     n'étaient pas écrits. Une entrée qui promet sans livrer transforme
     cette page en liste d'attente — elle reviendra le jour où le code
     existera, pas avant. */
  {
    id: 'revision', nom: 'Mode révision', metiers: ['etudiant'],
    resume: 'Étaler des séances de révision avant un examen.',
    detail: 'Des écarts croissants — rapprochés au début, espacés ensuite — ou un rythme régulier au choix. '
      + 'Les séances se replanifient toutes seules quand une est faite en retard.',
  },
  /* ── Vie professionnelle ── */
  {
    id: 'bilan', nom: 'Bilan de la semaine', metiers: ['salarie', 'cadre', 'independant'],
    resume: 'Ce que tu as terminé cette semaine, prêt à copier.',
    detail: 'Pour un point hebdomadaire ou un entretien annuel. Le travail fait est toujours plus difficile à se rappeler que le travail à faire.',
  },
]

/** Les fonctionnalités de base, celles qu'on n'éteint pas. */
export const estDeBase = (f) => Boolean(f.base)

/**
 * Une fonctionnalité est-elle active ?
 *
 * Trois cas, dans cet ordre :
 *   1. De base → toujours oui, aucun réglage possible.
 *   2. Un choix explicite en base (`modules[id]` est un booléen) → il gagne.
 *   3. Sinon → le métier décide ; sans métier choisi, tout est allumé.
 *
 * ⚠️ Le défaut sans métier est OUI, et c'est délibéré : un compte créé
 * avant cette page a `metier` à NULL et `modules` vide. S'il valait non,
 * ces comptes perdraient le mode révision du jour au lendemain. Une
 * évolution ne retire jamais quelque chose à quelqu'un qui n'a rien
 * demandé.
 */
export function fonctionActive(modules, metier, id) {
  const f = FONCTIONNALITES.find((x) => x.id === id)
  if (!f) return false
  if (f.base) return true
  const choix = modules && typeof modules === 'object' ? modules[id] : undefined
  if (typeof choix === 'boolean') return choix
  if (!metier) return true
  return (f.metiers ?? []).includes(metier)
}

/** Les fonctionnalités qu'un métier allume par défaut. */
export function fonctionsDuMetier(metier) {
  return FONCTIONNALITES.filter((f) => !f.base && (f.metiers ?? []).includes(metier))
}

export const nomDuMetier = (id) => METIERS.find((m) => m.id === id)?.nom ?? null

/**
 * Remettre les valeurs conseillées d'un métier : on réécrit un objet
 * complet plutôt que d'effacer `modules`, pour que le choix reste
 * explicite et lisible en base.
 */
export function defautsDuMetier(metier) {
  return Object.fromEntries(
    FONCTIONNALITES
      .filter((f) => !f.base)
      .map((f) => [f.id, (f.metiers ?? []).includes(metier)])
  )
}
