import { today } from './dates.js'

/**
 * Le tri des rappels en trois paquets, une bonne fois pour toutes.
 *
 * La page Rappels du bureau et l'écran du téléphone montrent la même
 * chose autrement ; c'est la mise en forme qui diffère, pas le contenu.
 * Le calcul est donc ici, hors de React : une seule règle à corriger si
 * elle est fausse, et un test possible sans navigateur.
 *
 * Trois paquets et pas deux : « en retard » se distingue d'« aujourd'hui ».
 * Ils étaient mélangés, et un rappel de la semaine dernière se lisait
 * exactement comme celui du matin — alors que c'est justement celui-là
 * qu'il faut voir en premier.
 *
 * Ce qui n'apparaît nulle part : les rappels écartés (`seen_at`), et ceux
 * dont la tâche est cochée ou a disparu. Un rappel n'a plus rien à
 * annoncer quand la tâche est faite ; le laisser donnerait une liste qui
 * ne se vide jamais.
 *
 * @param {Array} rappels  lignes de `reminders`
 * @param {Array} taches   lignes de `tasks`
 * @param {string} [jour]  le jour de référence, pour les tests
 */
export function grouperRappels(rappels, taches, jour = today()) {
  const vivants = rappels
    .filter((r) => !r.seen_at)
    .map((r) => ({ rappel: r, tache: taches.find((t) => t.id === r.task_id) }))
    .filter(({ tache }) => tache && !tache.is_done)

  const parDate = (a, b) => a.rappel.remind_on.localeCompare(b.rappel.remind_on)

  const enRetard = vivants.filter((v) => v.rappel.remind_on < jour).sort(parDate)
  const aujourdhui = vivants.filter((v) => v.rappel.remind_on === jour).sort(parDate)

  // Les jours à venir sont groupés : « jeudi 10 septembre » puis ses lignes,
  // comme un agenda. Une liste plate de trente entrées ne se lit pas.
  const parJour = new Map()
  for (const v of vivants) {
    if (v.rappel.remind_on <= jour) continue
    if (!parJour.has(v.rappel.remind_on)) parJour.set(v.rappel.remind_on, [])
    parJour.get(v.rappel.remind_on).push(v)
  }
  const aVenir = [...parJour.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([j, lignes]) => ({ jour: j, lignes }))

  return {
    enRetard,
    aujourdhui,
    aVenir,
    /** Ce qui demande une action maintenant — le compte de la pastille. */
    aTraiter: enRetard.length + aujourdhui.length,
    nombreAVenir: aVenir.reduce((n, g) => n + g.lignes.length, 0),
  }
}
