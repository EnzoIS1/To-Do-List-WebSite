/**
 * Les métiers et les modules.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LE MÉTIER EST UN PRÉRÉGLAGE, PAS UN FILTRE
 *
 * La demande était que le métier active ou désactive des fonctionnalités —
 * le mode révision réservé aux étudiants, par exemple. Le modèle retenu
 * est différent, et c'est un désaccord assumé : un salarié prépare une
 * certification, un étudiant est auto-entrepreneur. Le métier prédit mal
 * les besoins réels.
 *
 * Il allume donc des modules PAR DÉFAUT, et chacun reste débrayable à la
 * main. On gagne la simplicité à l'inscription sans enfermer personne, et
 * il n'y a qu'un seul mécanisme à maintenir : les modules. Le métier
 * n'est qu'une liste de valeurs de départ.
 *
 * CE QUI EST LIVRÉ, ET CE QUI NE L'EST PAS
 *
 * Les modules ci-dessous commandent des fonctionnalités QUI EXISTENT
 * DÉJÀ. Les idées proposées par métier — « en attente de » pour les
 * salariés, les points à aborder pour les managers, les relances client
 * pour les indépendants — ne sont pas écrites : ce sont des
 * fonctionnalités entières, pas des interrupteurs. Le mécanisme est là
 * pour les accueillir, elles restent à construire.
 * ─────────────────────────────────────────────────────────────────────
 */

/**
 * Le catalogue. Ajouter un module ne demande AUCUNE migration : la base
 * ne vérifie que la forme (un objet de booléens), pas la liste.
 */
export const MODULES = [
  {
    id: 'revision',
    nom: 'Mode révision',
    aide: 'Étaler des séances de révision avant un examen, avec des écarts croissants.',
  },
  {
    id: 'courses',
    nom: 'Liste de courses',
    aide: 'Un panneau à part pour les articles à acheter.',
  },
  {
    id: 'recurrence',
    nom: 'Répétitions',
    aide: 'Faire revenir une tâche ou un article tous les jours, toutes les semaines, tous les mois.',
  },
  {
    id: 'notes',
    nom: 'Prise de notes',
    aide: 'Un endroit pour écrire ce qui n\'est pas encore une tâche.',
  },
]

/** Tous les modules allumés : c'est l'état de quelqu'un qui n'a rien choisi. */
export const TOUS_ALLUMES = Object.fromEntries(MODULES.map((m) => [m.id, true]))

export const METIERS = [
  {
    id: 'etudiant',
    nom: 'Étudiant',
    aide: 'Cours, devoirs, examens.',
    defauts: { revision: true, courses: true, recurrence: true, notes: true },
  },
  {
    id: 'salarie',
    nom: 'Salarié',
    aide: 'Des tâches à échéance, peu de révisions.',
    defauts: { revision: false, courses: true, recurrence: true, notes: true },
  },
  {
    id: 'cadre',
    nom: 'Cadre / manager',
    aide: 'Beaucoup de suivi, peu de courses.',
    defauts: { revision: false, courses: false, recurrence: true, notes: true },
  },
  {
    id: 'independant',
    nom: 'Chef d\'entreprise',
    aide: 'Des échéances qui reviennent, des relances.',
    defauts: { revision: false, courses: false, recurrence: true, notes: true },
  },
]

/**
 * Un module est-il allumé ?
 *
 * ⚠️ Le défaut est OUI, et c'est délibéré. Un profil créé avant cette
 * migration a `modules` à `{}` : si l'absence valait « éteint », tous les
 * comptes existants perdraient d'un coup leurs révisions, leurs courses
 * et leurs notes au premier chargement. Une migration ne doit jamais
 * retirer quelque chose à quelqu'un qui ne l'a pas demandé.
 */
export function moduleActif(modules, id) {
  if (!modules || typeof modules !== 'object') return true
  return modules[id] !== false
}

/** Le nom lisible d'un métier, ou null s'il n'a jamais été choisi. */
export function nomDuMetier(id) {
  return METIERS.find((m) => m.id === id)?.nom ?? null
}

/**
 * Les modules d'un métier, complétés : un module absent de la liste des
 * défauts (parce qu'ajouté après) reste allumé, pour la même raison que
 * ci-dessus.
 */
export function defautsDuMetier(id) {
  const metier = METIERS.find((m) => m.id === id)
  if (!metier) return { ...TOUS_ALLUMES }
  return { ...TOUS_ALLUMES, ...metier.defauts }
}
