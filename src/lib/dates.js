/**
 * Utilitaires de dates.
 *
 * Règle du projet : une date est un JOUR, jamais un instant. En base, la
 * colonne `due_date` est de type `date`. Ici, on la représente par une chaîne
 * 'AAAA-MM-JJ' — exactement ce que PostgreSQL attend et renvoie.
 *
 * ⚠️ N'utilise JAMAIS toISOString() pour fabriquer ces chaînes.
 * toISOString() convertit en temps universel : le 3 septembre à 23 h à Paris
 * devient '2026-09-03T21:00:00Z' en hiver, mais un 1er septembre à 00 h 30
 * devient '2026-08-31T22:30:00Z' — soit la VEILLE. Tes tâches s'afficheraient
 * au mauvais jour une partie de la journée. Tout passe par toDateKey().
 */

/** Date JS → 'AAAA-MM-JJ', en heure locale. */
export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'AAAA-MM-JJ' → Date JS à minuit, en heure locale. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Le jour courant, en heure locale. */
export function today() {
  return toDateKey(new Date())
}

/** Décale une clé de jour de n jours (n peut être négatif). */
export function addDays(key, n) {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** Nombre de jours entre deux clés. Négatif si b est avant a. */
export function daysBetween(a, b) {
  // On compare des midis pour rester insensible aux changements d'heure :
  // une journée de 23 h ou 25 h ne doit pas décaler le résultat.
  const da = fromDateKey(a); da.setHours(12, 0, 0, 0)
  const db = fromDateKey(b); db.setHours(12, 0, 0, 0)
  return Math.round((db - da) / 86400000)
}

export function isPast(key) { return daysBetween(today(), key) < 0 }
export function isToday(key) { return key === today() }

/**
 * Grille du calendrier mensuel : 6 semaines de 7 jours commençant un lundi,
 * débordant sur les mois voisins pour que la grille soit toujours pleine.
 * Retourne un tableau de 42 clés 'AAAA-MM-JJ'.
 *
 * @param {number} year  année, ex. 2026
 * @param {number} month mois de 1 à 12 (pas l'index 0-11 de JavaScript)
 */
export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  // getDay() : 0 = dimanche … 6 = samedi. On veut lundi en tête.
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - offset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    days.push(toDateKey(d))
  }
  return days
}

/** Le mois d'une clé, sous forme { year, month }. */
export function monthOf(key) {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}

/** Mois suivant / précédent, sans déborder sur un 31 inexistant. */
export function shiftMonth({ year, month }, n) {
  const d = new Date(year, month - 1 + n, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const longFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long',
})
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** 'lundi 15 septembre' */
export function formatLong(key) {
  return longFormat.format(fromDateKey(key))
}

/** 'septembre 2026' */
export function formatMonth({ year, month }) {
  return monthFormat.format(new Date(year, month - 1, 1))
}

/** 'aujourd'hui', 'demain', 'en retard de 3 jours', 'dans 5 jours'… */
export function formatRelative(key) {
  const n = daysBetween(today(), key)
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  if (n === -1) return 'hier'
  if (n < 0) return `en retard de ${-n} jours`
  return `dans ${n} jours`
}

/**
 * « Ce soir » après 17 h, « Aujourd'hui » avant.
 *
 * Enzo ouvre le site en rentrant des cours, mais figer « Ce soir » dans le
 * titre sonnerait faux le matin. Le titre suit donc l'heure.
 */
export function titreDuMoment() {
  return new Date().getHours() >= 17 ? 'Ce soir' : "Aujourd'hui"
}
