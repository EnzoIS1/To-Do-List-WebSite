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
import { addDays, daysBetween } from './dates.js'

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
