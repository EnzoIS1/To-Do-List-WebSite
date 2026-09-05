/** node src/lib/listeRappels.test.js */
import assert from 'node:assert/strict'
import { grouperRappels } from './listeRappels.js'

let n = 0
const test = (nom, fn) => { fn(); n++; console.log(`  ok   ${nom}`) }

const JOUR = '2026-09-10'
const taches = [
  { id: 't1', title: 'Devoir', is_done: false },
  { id: 't2', title: 'Ménage', is_done: false },
  { id: 'fait', title: 'Fini', is_done: true },
]
const r = (id, task_id, remind_on, extra = {}) => ({ id, task_id, remind_on, ...extra })

test('les trois paquets sont séparés', () => {
  const g = grouperRappels([
    r('a', 't1', '2026-09-05'),
    r('b', 't2', JOUR),
    r('c', 't1', '2026-09-12'),
  ], taches, JOUR)
  assert.equal(g.enRetard.length, 1)
  assert.equal(g.aujourdhui.length, 1)
  assert.equal(g.nombreAVenir, 1)
  assert.equal(g.aTraiter, 2)
})

test('un rappel écarté disparaît', () => {
  const g = grouperRappels([r('a', 't1', JOUR, { seen_at: '2026-09-10T08:00:00Z' })], taches, JOUR)
  assert.equal(g.aTraiter, 0)
})

test('un rappel de tâche cochée disparaît', () => {
  const g = grouperRappels([r('a', 'fait', JOUR)], taches, JOUR)
  assert.equal(g.aTraiter, 0)
})

test('un rappel orphelin ne fait pas planter la page', () => {
  const g = grouperRappels([r('a', 'inconnue', JOUR)], taches, JOUR)
  assert.equal(g.aTraiter, 0)
})

test('les jours à venir sont groupés et ordonnés', () => {
  const g = grouperRappels([
    r('a', 't1', '2026-09-20'),
    r('b', 't2', '2026-09-12'),
    r('c', 't1', '2026-09-12'),
  ], taches, JOUR)
  assert.deepEqual(g.aVenir.map((x) => x.jour), ['2026-09-12', '2026-09-20'])
  assert.equal(g.aVenir[0].lignes.length, 2)
})

test('le retard est trié du plus ancien au plus récent', () => {
  const g = grouperRappels([
    r('a', 't1', '2026-09-08'),
    r('b', 't2', '2026-09-02'),
  ], taches, JOUR)
  assert.deepEqual(g.enRetard.map((x) => x.rappel.id), ['b', 'a'])
})

console.log(`\n✓ ${n} tests passés.\n`)
