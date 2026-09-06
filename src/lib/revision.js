/**
 * Planification des révisions.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI EST ÉTABLI, ET CE QUI NE L'EST PAS
 *
 * Établi : réviser plusieurs fois à des dates espacées bat une seule séance
 * de même durée totale, et l'écart optimal entre deux séances dépend de la
 * date à laquelle il faut se souvenir. Cepeda, Vul, Rohrer, Wixted et
 * Pashler (2008, Psychological Science) ont testé des écarts fixes pour des
 * délais de restitution de 7, 35, 70 et 350 jours : les écarts les plus
 * efficaces étaient respectivement de 1, 11, 21 et 21 jours en rappel libre.
 * Autrement dit, l'écart utile grandit avec l'échéance, mais moins vite
 * qu'elle — il passe d'environ 14 % du délai à 6 %.
 *   https://files.eric.ed.gov/fulltext/ED505660.pdf
 *
 * Non établi : la suite exacte ci-dessous. Cette étude compare DEUX séances,
 * pas cinq. Aucune expérience ne dit « 1-3-7-14-30 » ; c'est une convention
 * d'applications, pas un résultat mesuré. Ce que le calcul suivant reprend
 * de la littérature, c'est le seul principe robuste : des écarts CROISSANTS,
 * une première révision rapprochée, une dernière proche de l'examen. Le
 * placement précis est un choix d'ingénierie, assumé comme tel.
 * ─────────────────────────────────────────────────────────────────────────
 */
// Extension explicite : ce module est aussi exécuté par Node pour ses tests,
// et Node — contrairement à Vite — ne devine pas le « .js » manquant.
import { addDays, daysBetween, fromDateKey } from './dates.js'

/** Nombre de séances selon le temps disponible. Au-delà, on sature. */
function nombreDeSeances(portee) {
  if (portee < 2) return 0
  if (portee < 5) return 2
  if (portee < 14) return 3
  if (portee < 45) return 4
  if (portee < 120) return 5
  if (portee < 250) return 6
  // Au-delà, ajouter des séances sert surtout à garder la première proche
  // de l'apprentissage : avec cinq séances sur un an, la première tomberait
  // douze jours après le cours, ce qui laisse trop de temps à l'oubli.
  return 7
}

/**
 * Les jours de révision entre `depart` et `examen`, écarts croissants.
 *
 * Les positions suivent (2^k − 1) / (2^n − 1) : chaque écart vaut le double
 * du précédent. La dernière séance tombe la veille de l'examen, la première
 * dans les tout premiers jours — les deux bouts que la littérature
 * recommande de ne pas manquer.
 *
 * @param {string} depart  'AAAA-MM-JJ', le jour où la notion est apprise
 * @param {string} examen  'AAAA-MM-JJ', le jour du contrôle
 * @returns {string[]} jours de révision, croissants, sans doublon,
 *                     tous strictement entre `depart` et `examen`
 */
export function datesDeRevision(depart, examen, nombreVoulu = null) {
  const portee = daysBetween(depart, examen)
  if (portee < 2) return []
  // `nombreVoulu` sert à replanifier : quand une séance est cochée en
  // retard, on redistribue le nombre de séances qui restent sur le temps
  // qui reste. On ne peut pas en placer plus qu'il n'y a de jours libres.
  const n = Math.min(nombreVoulu ?? nombreDeSeances(portee), portee - 1)
  if (n <= 0) return []

  const utile = portee - 1          // la dernière séance est la veille
  const total = 2 ** n - 1
  const jours = []

  for (let k = 1; k <= n; k++) {
    const decalage = Math.round(((2 ** k - 1) / total) * utile)
    const jour = addDays(depart, Math.max(1, decalage))
    // Deux positions peuvent arrondir au même jour quand la portée est
    // courte : on ne crée pas deux révisions le même matin.
    if (!jours.includes(jour) && daysBetween(jour, examen) >= 1) jours.push(jour)
  }

  return jours
}

/** Phrase affichée sous le champ, pour que le calcul ne soit pas une boîte noire. */
export function resumeDeRevision(depart, examen) {
  const jours = datesDeRevision(depart, examen)
  if (jours.length === 0) {
    return daysBetween(depart, examen) <= 0
      ? "La date d'examen doit être après le jour de la tâche."
      : "L'examen est trop proche pour étaler des révisions."
  }
  const ecarts = jours.map((j, i) => daysBetween(i === 0 ? depart : jours[i - 1], j))
  return `${jours.length} révisions, à +${ecarts.join(' j, +')} j.`
}


/* ══════════════════════════════════════════════════════════════════════
   LE RYTHME AU CHOIX

   Tout ce qui précède impose un rythme : des écarts croissants, calculés.
   C'est le meilleur défaut, et c'est celui que la littérature soutient —
   mais ce n'est pas toujours ce qu'on veut. « Un jour sur deux jusqu'au
   contrôle » est une demande parfaitement raisonnable : c'est un rythme
   qu'on tient, qu'on prévoit, et qu'on peut caler sur un emploi du temps.

   D'où un plan explicite, décrit par un objet, et une seule fonction qui
   le transforme en dates. Le mode « espacees » délègue au calcul
   ci-dessus : il n'y a pas deux implémentations de la courbe de l'oubli.
   ══════════════════════════════════════════════════════════════════════ */

/** Le plan par défaut : ce que faisait le site avant qu'on puisse choisir. */
export const PLAN_DEFAUT = {
  mode: 'espacees',   // 'espacees' | 'reguliere'
  tousLes: 2,         // mode régulier : une séance tous les N jours
  nombre: null,       // mode espacé : nombre de séances voulu, null = auto
  sansWeekend: false, // ne pas poser de séance le samedi ni le dimanche
  debut: null,        // début de la période, null = aujourd'hui
  fin: null,          // fin de la période, null = l'échéance de la tâche
}

/** Un plan complet, quelles que soient les cases laissées vides. */
export const planComplet = (plan) => ({ ...PLAN_DEFAUT, ...(plan ?? {}) })

/**
 * Samedi ou dimanche ?
 *
 * `fromDateKey` construit une date locale à midi (voir lib/dates), donc
 * getDay() est fiable : pas de bascule de jour selon le fuseau.
 */
const estWeekend = (cle) => [0, 6].includes(fromDateKey(cle).getDay())

/** Le lundi suivant, pour une séance qui tombait un samedi ou un dimanche. */
function reporteApresWeekend(cle) {
  let jour = cle
  while (estWeekend(jour)) jour = addDays(jour, 1)
  return jour
}

/**
 * Les jours de révision d'un plan, entre `depart` et `fin`.
 *
 * Règles communes aux deux modes, et volontairement strictes :
 *   — rien le jour de l'échéance ni après (on révise AVANT le contrôle) ;
 *   — rien avant le départ ;
 *   — jamais deux séances le même jour.
 *
 * Le mode régulier commence LE JOUR DU DÉPART : « un jour sur deux à
 * partir d'aujourd'hui » place bien une séance aujourd'hui. Le mode espacé,
 * lui, garde son comportement d'origine (première séance le lendemain au
 * plus tôt), parce que c'est celui que ses tests décrivent.
 *
 * @param {string} depart 'AAAA-MM-JJ'
 * @param {string} fin    'AAAA-MM-JJ', l'échéance de la tâche
 * @param {object} plan   voir PLAN_DEFAUT
 * @returns {string[]} jours croissants, sans doublon
 */
export function planifierRevisions(depart, fin, plan = PLAN_DEFAUT) {
  const { mode, tousLes, nombre, sansWeekend } = planComplet(plan)
  const portee = daysBetween(depart, fin)
  if (portee < 1) return []

  /*
   * Les deux modes traitent le week-end différemment, et c'est voulu.
   *
   * En régulier, « un jour sur deux sans le week-end » veut dire un jour
   * sur deux PARMI LES JOURS D'ÉCOLE : on compte le rythme sur les jours
   * retenus. Reporter au lundi donnerait des paquets de deux séances
   * collées (samedi reporté au lundi, plus le lundi déjà prévu).
   *
   * En espacé, les dates viennent de la courbe et ne se recomptent pas :
   * une séance tombée un samedi est reportée au lundi, et si le lundi est
   * déjà pris, le doublon saute plus bas.
   */
  let jours = mode === 'reguliere'
    ? joursReguliers(depart, fin, Math.max(1, Math.round(tousLes || 1)), sansWeekend)
    : datesDeRevision(depart, fin, nombre)

  if (sansWeekend && mode !== 'reguliere') jours = jours.map(reporteApresWeekend)

  const vus = new Set()
  return jours
    .filter((j) => daysBetween(depart, j) >= 0 && daysBetween(j, fin) >= 1)
    .filter((j) => (vus.has(j) ? false : vus.add(j)))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Une séance tous les N jours, du départ jusqu'à la veille de l'échéance.
 *
 * `sansWeekend` retire samedi et dimanche des jours COMPTÉS : le pas
 * s'applique alors aux seuls jours d'école.
 */
function joursReguliers(depart, fin, tousLes, sansWeekend) {
  const candidats = []
  // Garde-fou de boucle : une échéance dans dix ans ne doit pas faire
  // tourner le calcul des milliers de fois pour rien.
  for (let j = depart, n = 0; daysBetween(j, fin) >= 1 && n < 800; j = addDays(j, 1), n++) {
    if (!sansWeekend || !estWeekend(j)) candidats.push(j)
  }
  const jours = []
  for (let i = 0; i < candidats.length && jours.length < PLAFOND_SEANCES; i += tousLes) {
    jours.push(candidats[i])
  }
  return jours
}

/**
 * Le plafond de séances d'un plan.
 *
 * Sans lui, « tous les jours » jusqu'à un examen dans six mois créerait
 * 180 tâches d'un clic — et il faudrait les supprimer une par une. Le
 * panneau annonce le nombre avant d'appliquer, ce plafond n'est que la
 * dernière barrière.
 */
export const PLAFOND_SEANCES = 60

/**
 * La phrase qui décrit un plan avant de l'appliquer.
 *
 * L'aperçu compte plus qu'il n'en a l'air : « tous les 2 jours » sur trois
 * mois, c'est 45 tâches. Mieux vaut le lire que le découvrir.
 */
export function resumeDuPlan(depart, fin, plan) {
  const jours = planifierRevisions(depart, fin, plan)
  if (jours.length === 0) return "Aucune séance ne tient dans cette période."
  const ecarts = jours.map((j, i) => daysBetween(i === 0 ? depart : jours[i - 1], j))
  const moyen = Math.round((ecarts.reduce((a, b) => a + b, 0) / ecarts.length) * 10) / 10
  return `${jours.length} séance${jours.length > 1 ? 's' : ''}, ` +
    `${planComplet(plan).mode === 'reguliere'
      ? `une tous les ${planComplet(plan).tousLes} jours`
      : `écarts croissants (${moyen} j en moyenne)`}.`
}

/**
 * Le replanning d'une série entamée.
 *
 * Il sert quand une séance est validée EN RETARD : les séances suivantes
 * restent alors collées à leurs dates d'origine et peuvent tomber le
 * lendemain, ce qui annule l'espacement — c'est-à-dire tout l'intérêt.
 * On redistribue donc ce qui reste sur le temps qui reste, en gardant le
 * rythme choisi : un « un jour sur deux » ne doit pas se transformer en
 * écarts croissants dans le dos de l'utilisateur.
 */
export function replanifierRevisions(depart, fin, plan, nombreRestant) {
  const p = planComplet(plan)
  if (nombreRestant <= 0) return []
  return p.mode === 'reguliere'
    ? planifierRevisions(depart, fin, p).slice(0, nombreRestant)
    : planifierRevisions(depart, fin, { ...p, nombre: nombreRestant })
}


/**
 * Les deux bornes réelles d'un plan.
 *
 * Le panneau laisse choisir « du … au … », mais les deux champs ont un
 * défaut qui suffit dans la plupart des cas : on commence aujourd'hui —
 * c'est le jour où on décide de réviser — et on s'arrête à l'échéance de
 * la tâche, qui est déjà écrite dessus. Tant qu'ils valent null, changer
 * la date de la tâche déplace la fin des révisions avec elle ; c'est
 * seulement en les remplissant qu'on les fige.
 */
export function bornesDuPlan(plan, echeanceTache, aujourdhui) {
  const p = planComplet(plan)
  return {
    depart: p.debut ?? aujourdhui,
    fin: p.fin ?? echeanceTache ?? null,
  }
}
