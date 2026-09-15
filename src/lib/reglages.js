/**
 * Les réglages des fonctionnalités.
 *
 * ─────────────────────────────────────────────────────────────────────
 * UN SAC, ET DES LECTURES TOLÉRANTES
 *
 * Tout tient dans `profiles.reglages`, un objet JSON. La base ne vérifie
 * que la forme — que c'est bien un objet — et rien d'autre : énumérer
 * les clés en SQL reviendrait à faire une migration par réglage, ce
 * qu'on cherche précisément à éviter.
 *
 * Le prix de cette liberté, c'est qu'il faut lire avec prudence. Chaque
 * accesseur ci-dessous VÉRIFIE le type de ce qu'il trouve et retombe sur
 * le défaut si la valeur est abîmée. Un réglage cassé doit donner le
 * comportement d'origine, jamais une erreur ni un silence.
 *
 * LA RÈGLE DU DÉFAUT
 *
 * Absent = comme avant. Toujours. C'est ce qui garantit qu'aucune
 * évolution ne change le comportement d'un compte qui n'a rien demandé —
 * la même règle que pour les modules et les récurrences.
 * ─────────────────────────────────────────────────────────────────────
 */

export const JOURS_SEMAINE = [
  { n: 1, court: 'Lun', nom: 'lundi' },
  { n: 2, court: 'Mar', nom: 'mardi' },
  { n: 3, court: 'Mer', nom: 'mercredi' },
  { n: 4, court: 'Jeu', nom: 'jeudi' },
  { n: 5, court: 'Ven', nom: 'vendredi' },
  { n: 6, court: 'Sam', nom: 'samedi' },
  { n: 7, court: 'Dim', nom: 'dimanche' },
]

export const TOUS_LES_JOURS = [1, 2, 3, 4, 5, 6, 7]
export const EN_SEMAINE = [1, 2, 3, 4, 5]

export const EMPLACEMENTS = [
  { id: 'tableau', nom: 'Tableau de bord', aide: 'Un panneau parmi les autres.' },
  { id: 'page', nom: 'Page dédiée', aide: 'Sa propre page, atteignable depuis la barre latérale.' },
  { id: 'aucun', nom: 'Nulle part', aide: 'Active, mais jamais affichée d\'elle-même.' },
]

export const EMPLACEMENT_DEFAUT = 'tableau'

const objet = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** Lit un booléen, avec un défaut. Toute autre valeur = le défaut. */
const bool = (v, defaut) => (typeof v === 'boolean' ? v : defaut)

/** Lit un entier borné, avec un défaut. */
const entier = (v, min, max, defaut) =>
  (Number.isInteger(v) && v >= min && v <= max ? v : defaut)

/** Lit une valeur parmi une liste, avec un défaut. */
const parmi = (v, valeurs, defaut) => (valeurs.includes(v) ? v : defaut)

/**
 * Les jours où le résumé du matin part.
 *
 * ⚠️ Cette valeur est aussi lue CÔTÉ SERVEUR, par `resumes_a_envoyer()`
 * (migration 0014). Les deux lectures doivent s'accorder : un tableau
 * d'entiers 1-7, où 1 est le lundi (norme ISO, comme `isodow`). Si tu
 * changes la convention ici, il faut changer le SQL au même moment.
 */
export function joursResume(reglages) {
  const v = objet(reglages).joursResume
  if (!Array.isArray(v)) return TOUS_LES_JOURS
  const propre = v.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
  // Une liste vide couperait le résumé sans que l'écran le dise jamais
  // aussi clairement que l'interrupteur « résumé actif » prévu pour ça.
  return propre.length > 0 ? [...new Set(propre)].sort((a, b) => a - b) : TOUS_LES_JOURS
}

/** « Tous les jours », « En semaine », « Lun, Mer, Ven ». */
export function resumeDesJours(jours) {
  const j = [...jours].sort((a, b) => a - b)
  if (j.length === 7) return 'Tous les jours'
  if (j.length === 5 && j.every((n, i) => n === i + 1)) return 'En semaine'
  if (j.length === 2 && j[0] === 6 && j[1] === 7) return 'Le week-end'
  return j.map((n) => JOURS_SEMAINE.find((x) => x.n === n)?.court).filter(Boolean).join(', ')
}

/**
 * La catégorie qui sert de liste de courses.
 *
 * ⚠️ CE RÉGLAGE CORRIGE UN PIÈGE. Avant, la catégorie était devinée par
 * son NOM — tout ce qui commence par « course ». Renommer « Courses » en
 * « Supermarché » vidait le panneau, sans message, sans explication.
 *
 * On garde la détection par le nom comme REPLI : c'est ce qui fait que
 * les comptes existants continuent de marcher sans rien régler.
 */
export function categorieCoursesChoisie(reglages) {
  const v = objet(reglages).categorieCourses
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Où afficher une fonctionnalité : 'tableau', 'page' ou 'aucun'. */
export function emplacementDe(reglages, id) {
  const v = objet(objet(reglages).emplacements)[id]
  return EMPLACEMENTS.some((e) => e.id === v) ? v : EMPLACEMENT_DEFAUT
}

/** Réécrit un emplacement sans toucher aux autres réglages. */
export function avecEmplacement(reglages, id, emplacement) {
  return {
    ...objet(reglages),
    emplacements: { ...objet(objet(reglages).emplacements), [id]: emplacement },
  }
}

/** Réécrit une clé de premier niveau sans toucher au reste. */
export function avecReglage(reglages, cle, valeur) {
  return { ...objet(reglages), [cle]: valeur }
}

/* ══════════════════════════════════════════════════════════════════════
   LES RÉGLAGES PAR FONCTIONNALITÉ

   Chacun suit la même règle que les précédents : absent ou abîmé = le
   comportement d'avant. C'est ce qui garantit qu'ajouter un réglage ne
   change jamais rien pour quelqu'un qui n'y touche pas.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Le premier jour de la semaine — 1 (lundi) ou 7 (dimanche).
 *
 * UN RÉGLAGE, DEUX ENDROITS : la grille du calendrier ET le découpage du
 * bilan hebdomadaire. Les laisser diverger donnerait un calendrier qui
 * commence le dimanche et un « bilan de la semaine » qui commence le
 * lundi — deux semaines différentes dans la même application.
 */
export const PREMIERS_JOURS = [
  { id: 1, nom: 'Lundi' },
  { id: 7, nom: 'Dimanche' },
]
export const premierJour = (reglages) => entier(objet(reglages).premierJour, 1, 7, 1) === 7 ? 7 : 1

/** Le format du texte copié par le bilan. */
export const FORMATS_BILAN = [
  { id: 'complet', nom: 'Avec les catégories', aide: '« Rendre le dossier (IUT) »' },
  { id: 'simple', nom: 'Titres seuls', aide: '« Rendre le dossier »' },
]
export const formatBilan = (reglages) =>
  parmi(objet(reglages).formatBilan, ['complet', 'simple'], 'complet')

/** Les délais proposés d'un clic dans les réglages. */
export const DELAIS_RELANCE_PROPOSES = [
  { jours: 3, nom: '3 jours' },
  { jours: 7, nom: '1 semaine' },
  { jours: 14, nom: '2 semaines' },
  { jours: 30, nom: '1 mois' },
]

/** Le délai de relance proposé quand on pose une nouvelle attente. */
export const delaiRelanceDefaut = (reglages) =>
  entier(objet(reglages).delaiRelance, 1, 365, 7)

/**
 * L'échéance des occurrences d'une répétition.
 *
 *   'auto'  — datée, sauf dans la liste de courses (le comportement actuel)
 *   'oui'   — toujours datée
 *   'non'   — jamais datée, donc jamais de rappel automatique
 */
export const ECHEANCES_REPETITION = [
  { id: 'auto', nom: 'Selon la catégorie', aide: 'Datée, sauf dans la liste de courses.' },
  { id: 'oui', nom: 'Toujours', aide: 'Chaque occurrence est datée, donc rappelée la veille.' },
  { id: 'non', nom: 'Jamais', aide: 'Les occurrences arrivent sans date ni rappel.' },
]
export const echeanceRepetition = (reglages) =>
  parmi(objet(reglages).echeanceRepetition, ['auto', 'oui', 'non'], 'auto')

/** La catégorie où atterrissent les nouvelles notes. null = aucune. */
export const categorieNotes = (reglages) => {
  const v = objet(reglages).categorieNotes
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Demander confirmation avant de supprimer une tâche. */
export const confirmerSuppression = (reglages) =>
  bool(objet(reglages).confirmerSuppression, false)

/** Le nombre de séances proposé par défaut en mode révision. null = auto. */
export const nombreRevisionsDefaut = (reglages) => {
  const v = objet(reglages).nombreRevisions
  return entier(v, 2, 12, null)
}
