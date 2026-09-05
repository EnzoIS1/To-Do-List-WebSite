/**
 * L'ordre d'affichage des tâches dans une liste.
 *
 * Une règle traverse tous les tris : **une tâche cochée descend en bas**,
 * quel que soit l'ordre choisi. Ce qui reste à faire est ce qu'on vient
 * chercher ; le reste est de l'historique et n'a pas à s'intercaler au
 * milieu.
 */

export const TRIS = [
  { id: 'proche', nom: 'Date, du plus proche', aide: 'Ce qui arrive en premier, en premier.' },
  { id: 'lointain', nom: 'Date, du plus lointain', aide: 'Le plus loin en tête.' },
  { id: 'ajout', nom: 'Ordre d\'ajout', aide: 'Comme tu les as écrites.' },
  { id: 'alpha', nom: 'Alphabétique', aide: 'Par nom, de A à Z.' },
]

export const TRI_DEFAUT = 'proche'

/**
 * Compare deux dates 'AAAA-MM-JJ' dont l'une peut manquer.
 * Une tâche sans date passe toujours APRÈS celles qui en ont une : elle
 * n'est pas urgente, elle est juste non planifiée.
 */
function comparerDates(a, b, sens) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -sens : a > b ? sens : 0
}

/**
 * Trie une liste de tâches, sans la modifier.
 *
 * @param {Array} taches
 * @param {string} tri  un des identifiants de TRIS
 */
export function trierTaches(taches, tri = TRI_DEFAUT) {
  const copie = [...taches]

  copie.sort((a, b) => {
    // Les faites, tout en bas — avant même de regarder le tri demandé.
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1

    switch (tri) {
      case 'lointain': {
        const d = comparerDates(a.due_date, b.due_date, -1)
        if (d !== 0) return d
        break
      }
      case 'alpha': {
        // `localeCompare` avec la locale française : « école » se range
        // entre « eau » et « effort », pas après « zèbre » comme le ferait
        // une comparaison brute de codes de caractères.
        const n = (a.title ?? '').localeCompare(b.title ?? '', 'fr', { sensitivity: 'base' })
        if (n !== 0) return n
        break
      }
      case 'ajout':
        break                                  // l'ordre de création, ci-dessous
      case 'proche':
      default: {
        const d = comparerDates(a.due_date, b.due_date, 1)
        if (d !== 0) return d
        break
      }
    }

    // Départage stable : deux tâches à égalité gardent toujours le même
    // ordre relatif d'un rendu à l'autre. Sans ça, la liste sautillerait
    // à chaque rechargement.
    const c = (a.created_at ?? '').localeCompare(b.created_at ?? '')
    return c !== 0 ? c : (a.id ?? '').localeCompare(b.id ?? '')
  })

  return copie
}
