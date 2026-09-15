import { fromDateKey, toDateKey, addDays, today } from './dates.js'

/**
 * Le bilan de la semaine : ce qui a été TERMINÉ.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE FONCTIONNALITÉ EXISTE
 *
 * Une to-do list montre ce qu'il reste à faire, et efface ce qui est
 * fait — c'est même tout son intérêt. Mais au moment d'un point
 * hebdomadaire ou d'un entretien annuel, la question est exactement
 * inverse : qu'est-ce que j'ai fait ? Et là, tout le monde reconstruit
 * de mémoire, en oubliant les trois quarts.
 *
 * LA SEMAINE COMMENCE LE LUNDI
 *
 * `getDay()` renvoie 0 pour dimanche : une semaine qui commencerait là
 * couperait le week-end en deux et donnerait un « bilan » contenant le
 * samedi de la semaine d'avant. On ramène donc dimanche en 7e position.
 *
 * LA DATE UTILISÉE EST `completed_at`, PAS `due_date`
 *
 * Une tâche due lundi et terminée jeudi appartient au jeudi : le bilan
 * raconte ce qui s'est passé, pas ce qui était prévu.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Le lundi de la semaine qui contient `jour`. */
export function debutDeSemaine(jour = today()) {
  const d = fromDateKey(jour)
  const position = (d.getDay() + 6) % 7   // lundi = 0, dimanche = 6
  return addDays(jour, -position)
}

/** Le dimanche de la même semaine. */
export const finDeSemaine = (jour = today()) => addDays(debutDeSemaine(jour), 6)

/**
 * Le jour où une tâche a été terminée, en date locale.
 *
 * `completed_at` est un horodatage UTC. Le découper avec `slice(0, 10)`
 * donnerait le jour UTC : une tâche cochée un lundi à 00 h 30 à Paris
 * (soit dimanche 23 h 30 UTC) serait comptée dans la semaine d'avant.
 * On repasse donc par une vraie date locale — même piège que celui
 * documenté dans lib/dates.js.
 */
export function jourDeCloture(tache) {
  if (!tache.completed_at) return null
  return toDateKey(new Date(tache.completed_at))
}

/**
 * Les tâches terminées sur une période, groupées par jour.
 *
 * @returns {{jour: string, taches: object[]}[]} du plus ancien au plus récent
 */
export function bilanDeLaPeriode(taches, debut, fin) {
  const parJour = new Map()
  for (const t of taches) {
    if (!t.is_done) continue
    const jour = jourDeCloture(t)
    if (!jour || jour < debut || jour > fin) continue
    if (!parJour.has(jour)) parJour.set(jour, [])
    parJour.get(jour).push(t)
  }
  return [...parJour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jour, liste]) => ({
      jour,
      taches: liste.sort((a, b) => a.title.localeCompare(b.title, 'fr')),
    }))
}

/**
 * Le bilan en texte brut, prêt à coller dans un message ou un document.
 *
 * Volontairement sans mise en forme riche : ça doit survivre à un collage
 * dans Teams, dans un mail ou dans un carnet.
 */
export function bilanEnTexte(groupes, nomDeCategorie = () => null) {
  if (groupes.length === 0) return 'Rien de terminé sur la période.'
  return groupes.map(({ jour, taches }) => {
    const lignes = taches.map((t) => {
      const cat = nomDeCategorie(t)
      return `  - ${t.title}${cat ? ` (${cat})` : ''}`
    })
    return [jour, ...lignes].join('\n')
  }).join('\n\n')
}

/** Combien de tâches au total dans un bilan. */
export const compterBilan = (groupes) =>
  groupes.reduce((n, g) => n + g.taches.length, 0)
