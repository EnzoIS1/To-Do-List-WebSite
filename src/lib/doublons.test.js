import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sansDoublonsDeTache } from './rappels.js'
import { grouperRappels } from './listeRappels.js'

const l = (taskId, remindOn, id = `${taskId}-${remindOn}`) =>
  ({ rappel: { id, task_id: taskId, remind_on: remindOn }, tache: { id: taskId, is_done: false } })

test('une tâche avec deux rappels échus ne sort qu une fois', () => {
  const r = sansDoublonsDeTache([l('A', '2026-10-01'), l('A', '2026-10-06')])
  assert.equal(r.length, 1)
  // On garde le plus RÉCENT : « la veille » dit où on en est vraiment.
  assert.equal(r[0].rappel.remind_on, '2026-10-06')
})

test('des tâches différentes ne se mangent pas entre elles', () => {
  const r = sansDoublonsDeTache([l('A', '2026-10-01'), l('B', '2026-10-02'), l('A', '2026-10-05')])
  assert.deepEqual(r.map((x) => x.rappel.task_id), ['B', 'A'])
})

test('l ordre d arrivée est respecté', () => {
  // La fonction filtre, elle ne retrie pas : l'appelant a déjà décidé.
  const r = sansDoublonsDeTache([l('B', '2026-10-02'), l('A', '2026-10-05'), l('A', '2026-10-01')])
  assert.deepEqual(r.map((x) => x.rappel.task_id), ['B', 'A'])
})

test('une liste sans doublon est rendue telle quelle', () => {
  const lignes = [l('A', '2026-10-01'), l('B', '2026-10-02')]
  assert.deepEqual(sansDoublonsDeTache(lignes), lignes)
})

test('la page Rappels dédoublonne le retard et aujourd hui', () => {
  const taches = [{ id: 'A', is_done: false }]
  const rappels = [
    { id: '1', task_id: 'A', remind_on: '2026-10-01' },
    { id: '2', task_id: 'A', remind_on: '2026-10-05' },
    { id: '3', task_id: 'A', remind_on: '2026-10-07' },
  ]
  const g = grouperRappels(rappels, taches, '2026-10-07')
  assert.equal(g.enRetard.length, 1, 'le retard doit être dédoublonné')
  assert.equal(g.enRetard[0].rappel.remind_on, '2026-10-05')
  assert.equal(g.aujourdhui.length, 1)
  assert.equal(g.aTraiter, 2)
})

test('les rappels À VENIR ne sont PAS dédoublonnés', () => {
  // Deux dates futures différentes sont deux informations différentes :
  // en masquer une cacherait un rappel demandé par l'utilisateur.
  const taches = [{ id: 'A', is_done: false }]
  const rappels = [
    { id: '1', task_id: 'A', remind_on: '2026-10-10' },
    { id: '2', task_id: 'A', remind_on: '2026-10-14' },
  ]
  const g = grouperRappels(rappels, taches, '2026-10-07')
  assert.equal(g.nombreAVenir, 2)
})
