/**
 * Le planificateur de révisions au choix.  node src/lib/plan-revision.test.js
 *
 * On ne teste pas « les bonnes dates » — il n'y a pas de vérité mesurée
 * là-dessus, et le rythme régulier est un choix de l'utilisateur, pas un
 * résultat de laboratoire. On teste les promesses que le panneau fait :
 * le pas demandé est respecté, rien ne tombe le jour du contrôle ni après,
 * rien ne double, le week-end est traité comme annoncé, et aucun réglage
 * ne peut engendrer une avalanche de tâches.
 */
import assert from 'node:assert/strict'
import {
  planifierRevisions, resumeDuPlan, planComplet, PLAN_DEFAUT, PLAFOND_SEANCES,
} from './revision.js'
import { addDays, daysBetween, fromDateKey } from './dates.js'

let n = 0
const test = (nom, fn) => { fn(); n++; console.log(`  ok   ${nom}`) }
const jourSemaine = (cle) => fromDateKey(cle).getDay()

const LUNDI = '2026-09-07'   // vérifié : le 7 septembre 2026 est un lundi
test('le repère de départ est bien un lundi', () => {
  assert.equal(jourSemaine(LUNDI), 1)
})

console.log('\nMode régulier')

test('« un jour sur deux » place une séance tous les deux jours', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 14), { mode: 'reguliere', tousLes: 2 })
  const ecarts = j.slice(1).map((x, i) => daysBetween(j[i], x))
  assert.ok(ecarts.every((e) => e === 2), ecarts.join(','))
})

test('la première séance tombe le jour du départ', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 10), { mode: 'reguliere', tousLes: 3 })
  assert.equal(j[0], LUNDI)
})

test('rien le jour du contrôle, rien après', () => {
  const fin = addDays(LUNDI, 9)
  const j = planifierRevisions(LUNDI, fin, { mode: 'reguliere', tousLes: 3 })
  assert.ok(j.every((x) => daysBetween(x, fin) >= 1), j.join(','))
})

test('un pas plus long que la période ne donne qu\'une séance', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 3), { mode: 'reguliere', tousLes: 30 })
  assert.equal(j.length, 1)
})

test('une échéance le lendemain ne laisse la place à rien… sauf le jour même', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 1), { mode: 'reguliere', tousLes: 2 })
  assert.deepEqual(j, [LUNDI])
})

test('une échéance passée ou le jour même ne donne aucune séance', () => {
  assert.deepEqual(planifierRevisions(LUNDI, LUNDI, { mode: 'reguliere' }), [])
  assert.deepEqual(planifierRevisions(LUNDI, addDays(LUNDI, -3), { mode: 'reguliere' }), [])
})

console.log('\nSans le week-end')

test('aucune séance un samedi ou un dimanche', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 40), {
    mode: 'reguliere', tousLes: 2, sansWeekend: true,
  })
  assert.ok(j.every((x) => ![0, 6].includes(jourSemaine(x))), j.join(','))
})

test('le pas se compte alors en jours d\'école, sans séances collées', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 30), {
    mode: 'reguliere', tousLes: 2, sansWeekend: true,
  })
  const ecarts = j.slice(1).map((x, i) => daysBetween(j[i], x))
  assert.ok(ecarts.every((e) => e >= 2), ecarts.join(','))
})

test('en mode espacé, une séance du week-end est reportée au lundi', () => {
  // Départ un vendredi : la courbe pose sa première séance le lendemain,
  // donc un samedi — c'est le cas qui doit bouger.
  const vendredi = addDays(LUNDI, 4)
  const j = planifierRevisions(vendredi, addDays(vendredi, 60), {
    mode: 'espacees', sansWeekend: true,
  })
  assert.ok(j.every((x) => ![0, 6].includes(jourSemaine(x))), j.join(','))
})

console.log('\nGarde-fous')

test('aucun doublon, jamais', () => {
  for (const plan of [
    { mode: 'reguliere', tousLes: 1 }, { mode: 'reguliere', tousLes: 1, sansWeekend: true },
    { mode: 'espacees' }, { mode: 'espacees', sansWeekend: true },
  ]) {
    for (const portee of [2, 3, 5, 9, 20, 60, 200]) {
      const j = planifierRevisions(LUNDI, addDays(LUNDI, portee), plan)
      assert.equal(new Set(j).size, j.length, `${JSON.stringify(plan)} portée ${portee}`)
      assert.ok(j.every((x, i) => i === 0 || daysBetween(j[i - 1], x) > 0), 'ordre croissant')
    }
  }
})

test('« tous les jours » sur un an ne crée pas des centaines de tâches', () => {
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 365), { mode: 'reguliere', tousLes: 1 })
  assert.equal(j.length, PLAFOND_SEANCES)
})

test('un pas absurde (0 ou négatif) est ramené à 1 jour, sans boucle infinie', () => {
  for (const tousLes of [0, -5, null, undefined, 1.4]) {
    const j = planifierRevisions(LUNDI, addDays(LUNDI, 6), { mode: 'reguliere', tousLes })
    assert.ok(j.length > 0 && j.length <= 6, `pas ${tousLes} → ${j.length}`)
  }
})

test('le mode espacé n\'a pas changé de comportement', () => {
  const parDefaut = planifierRevisions(LUNDI, addDays(LUNDI, 30), PLAN_DEFAUT)
  const ecarts = parDefaut.map((x, i) => daysBetween(i === 0 ? LUNDI : parDefaut[i - 1], x))
  assert.ok(ecarts.every((e, i) => i === 0 || e >= ecarts[i - 1]), ecarts.join(','))
})

test('un plan incomplet est complété par les valeurs par défaut', () => {
  assert.deepEqual(planComplet({ tousLes: 5 }), { ...PLAN_DEFAUT, tousLes: 5 })
  assert.deepEqual(planComplet(null), PLAN_DEFAUT)
  assert.deepEqual(
    planifierRevisions(LUNDI, addDays(LUNDI, 20), null),
    planifierRevisions(LUNDI, addDays(LUNDI, 20), PLAN_DEFAUT)
  )
})

console.log('\nLe résumé affiché avant d\'appliquer')

test('il annonce le nombre exact de séances', () => {
  const plan = { mode: 'reguliere', tousLes: 2 }
  const j = planifierRevisions(LUNDI, addDays(LUNDI, 14), plan)
  assert.match(resumeDuPlan(LUNDI, addDays(LUNDI, 14), plan), new RegExp(`^${j.length} séances`))
})

test('et il le dit quand rien ne tient', () => {
  assert.match(resumeDuPlan(LUNDI, LUNDI, { mode: 'reguliere' }), /Aucune séance/)
})

console.log(`\n✓ ${n} tests passés.\n`)
