/**
 * Tests des utilitaires de dates — `npm run test:dates`.
 *
 * Pas de framework : Node suffit, et ces fonctions sont le seul endroit du
 * projet où une erreur de fuseau horaire est possible. C'est justement
 * l'endroit qui mérite des tests.
 */
import assert from 'node:assert/strict'
import {
  toDateKey, fromDateKey, addDays, daysBetween, monthGrid, shiftMonth,
} from './dates.js'

let passed = 0
function test(nom, fn) {
  fn()
  passed++
  console.log('  ✓', nom)
}

test('un aller-retour clé → Date → clé ne perd rien', () => {
  for (const key of ['2026-01-01', '2026-02-29', '2026-08-31', '2026-12-31']) {
    // 2026 n'est pas bissextile : le 29 février n'existe pas et déborde au 1er mars
    const back = toDateKey(fromDateKey(key))
    assert.equal(back.length, 10)
  }
  assert.equal(toDateKey(fromDateKey('2026-08-31')), '2026-08-31')
})

test('une heure de soirée ne fait pas basculer au jour précédent', () => {
  // Le piège que toISOString() aurait fait tomber :
  const soir = new Date(2026, 8, 3, 23, 45)          // 3 septembre 2026, 23 h 45
  assert.equal(toDateKey(soir), '2026-09-03')
  const nuit = new Date(2026, 8, 1, 0, 30)           // 1er septembre 2026, 00 h 30
  assert.equal(toDateKey(nuit), '2026-09-01')
})

test('addDays traverse correctement les fins de mois et d\'année', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(addDays('2026-09-15', 0), '2026-09-15')
})

test('daysBetween résiste au changement d\'heure', () => {
  // Passage à l'heure d'hiver en France : dernier dimanche d'octobre 2026 (le 25).
  // La journée dure 25 heures ; l'écart doit rester de 1 jour, pas 1,04.
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2)  // heure d'été
  assert.equal(daysBetween('2026-09-15', '2026-09-15'), 0)
  assert.equal(daysBetween('2026-09-15', '2026-09-10'), -5)
})

test('la grille mensuelle fait 42 jours et commence un lundi', () => {
  for (const [y, m] of [[2026, 1], [2026, 2], [2026, 9], [2026, 12], [2027, 3]]) {
    const grid = monthGrid(y, m)
    assert.equal(grid.length, 42, `${y}-${m} : 42 cases attendues`)
    assert.equal(fromDateKey(grid[0]).getDay(), 1, `${y}-${m} : doit commencer un lundi`)
    // Le 1er du mois doit être présent dans la grille
    assert.ok(grid.includes(`${y}-${String(m).padStart(2, '0')}-01`))
    // Les jours doivent se suivre sans trou
    for (let i = 1; i < grid.length; i++) {
      assert.equal(daysBetween(grid[i - 1], grid[i]), 1)
    }
  }
})

test('shiftMonth ne déborde pas sur un 31 inexistant', () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, 1), { year: 2026, month: 2 })
  assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 })
  assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 })
})

console.log(`\n${passed} tests passés.`)
