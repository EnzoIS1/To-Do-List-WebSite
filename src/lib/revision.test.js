/**
 * Vérification du calcul des révisions.  node src/lib/revision.test.js
 *
 * On ne teste pas « les bonnes dates » — il n'existe pas de vérité mesurée
 * là-dessus. On teste les propriétés que le calcul doit garantir : écarts
 * croissants, rien après l'examen, rien en double, une première séance tôt.
 */
import { datesDeRevision, resumeDeRevision } from './revision.js'
import { addDays, daysBetween } from './dates.js'

let echecs = 0
function verifie(nom, condition, detail = '') {
  if (condition) { console.log(`  ok   ${nom}`) }
  else { echecs++; console.log(`  ÉCHEC ${nom} ${detail}`) }
}

const depart = '2026-09-05'

console.log('\nPortées variées')
for (const portee of [1, 2, 3, 5, 7, 14, 30, 45, 90, 200, 365]) {
  const examen = addDays(depart, portee)
  const jours = datesDeRevision(depart, examen)
  const ecarts = jours.map((j, i) => daysBetween(i === 0 ? depart : jours[i - 1], j))
  console.log(`  ${String(portee).padStart(3)} j → ${jours.length} séances  écarts +${ecarts.join(' +') || '—'}`)

  verifie(`portée ${portee} : tout est avant l'examen`,
    jours.every((j) => daysBetween(j, examen) >= 1))
  verifie(`portée ${portee} : tout est après le départ`,
    jours.every((j) => daysBetween(depart, j) >= 1))
  verifie(`portée ${portee} : aucun doublon`,
    new Set(jours).size === jours.length)
  verifie(`portée ${portee} : dates croissantes`,
    jours.every((j, i) => i === 0 || daysBetween(jours[i - 1], j) > 0))
  verifie(`portée ${portee} : écarts croissants`,
    ecarts.every((e, i) => i === 0 || e >= ecarts[i - 1]),
    `(${ecarts.join(', ')})`)
  if (portee >= 7) {
    verifie(`portée ${portee} : première séance dans la première moitié`,
      daysBetween(depart, jours[0]) <= portee / 2)
  }
}

console.log('\nCas limites')
verifie('examen le jour même → aucune révision', datesDeRevision(depart, depart).length === 0)
verifie('examen dans le passé → aucune révision', datesDeRevision(depart, '2026-08-01').length === 0)
verifie('examen demain → aucune révision', datesDeRevision(depart, addDays(depart, 1)).length === 0)
verifie('le résumé explique le refus',
  resumeDeRevision(depart, depart).includes('après le jour de la tâche'))
verifie('le résumé annonce le compte',
  resumeDeRevision(depart, addDays(depart, 30)).startsWith('4 révisions'),
  resumeDeRevision(depart, addDays(depart, 30)))

console.log(echecs === 0 ? '\nTout est vert.\n' : `\n${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
