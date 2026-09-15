import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  estEnAttente, joursDAttente, jourDeRelance, etatAttente,
  libelleAttente, grouperParPersonne, compterAttentes,
} from './delegation.js'

const JOUR = '2026-09-15'
const t = (champs) => ({ id: champs.title, is_done: false, ...champs })

test('une tâche cochée n est plus en attente', () => {
  assert.equal(estEnAttente(t({ title: 'A', attente_de: 'Bob' })), true)
  assert.equal(estEnAttente(t({ title: 'A', attente_de: 'Bob', is_done: true })), false)
  assert.equal(estEnAttente(t({ title: 'A' })), false)
})

test('le compteur de jours ne descend pas sous zéro', () => {
  assert.equal(joursDAttente(t({ title: 'A', attente_depuis: '2026-09-15' }), JOUR), 0)
  assert.equal(joursDAttente(t({ title: 'A', attente_depuis: '2026-09-03' }), JOUR), 12)
  // Une date de départ dans le futur ne doit pas afficher « depuis -5 jours ».
  assert.equal(joursDAttente(t({ title: 'A', attente_depuis: '2026-09-20' }), JOUR), 0)
})

test('le jour de relance est le départ plus le délai', () => {
  assert.equal(
    jourDeRelance(t({ title: 'A', attente_depuis: '2026-09-15', relance_apres: 7 })),
    '2026-09-22'
  )
  assert.equal(jourDeRelance(t({ title: 'A', attente_depuis: '2026-09-15' })), null)
})

test('les quatre états de l attente', () => {
  const base = { title: 'A', attente_de: 'Bob', attente_depuis: '2026-09-15' }
  assert.equal(etatAttente(t({ ...base }), JOUR), 'sans-delai')
  assert.equal(etatAttente(t({ ...base, relance_apres: 7 }), JOUR), 'calme')
  assert.equal(etatAttente(t({ ...base, attente_depuis: '2026-09-08', relance_apres: 7 }), JOUR), 'a-relancer')
  assert.equal(etatAttente(t({ ...base, attente_depuis: '2026-09-01', relance_apres: 7 }), JOUR), 'depasse')
})

test('le libellé se lit en français', () => {
  assert.equal(libelleAttente(t({ title: 'A', attente_depuis: '2026-09-15' }), JOUR), "depuis aujourd'hui")
  assert.equal(libelleAttente(t({ title: 'A', attente_depuis: '2026-09-14' }), JOUR), 'depuis hier')
  assert.equal(libelleAttente(t({ title: 'A', attente_depuis: '2026-09-05' }), JOUR), 'depuis 10 jours')
})

test('le groupement ignore la casse et les espaces', () => {
  const taches = [
    t({ title: 'A', attente_de: 'La compta', attente_depuis: '2026-09-10' }),
    t({ title: 'B', attente_de: '  la COMPTA ', attente_depuis: '2026-09-12' }),
  ]
  const g = grouperParPersonne(taches, JOUR)
  assert.equal(g.length, 1)
  assert.equal(g[0].taches.length, 2)
  // Le nom affiché est celui de l'attente la plus ancienne : il ne doit
  // pas changer d'orthographe sous les yeux au fil des saisies.
  assert.equal(g[0].personne, 'La compta')
})

test('les personnes sont triées par l attente la plus ancienne', () => {
  const taches = [
    t({ title: 'Récente', attente_de: 'Bob', attente_depuis: '2026-09-14' }),
    t({ title: 'Ancienne', attente_de: 'Alice', attente_depuis: '2026-09-01' }),
  ]
  const g = grouperParPersonne(taches, JOUR)
  assert.deepEqual(g.map((x) => x.personne), ['Alice', 'Bob'])
  assert.equal(g[0].joursMax, 14)
})

test('à l intérieur d une personne, la plus ancienne d abord', () => {
  const taches = [
    t({ title: 'Deux', attente_de: 'Bob', attente_depuis: '2026-09-12' }),
    t({ title: 'Un', attente_de: 'Bob', attente_depuis: '2026-09-02' }),
  ]
  const g = grouperParPersonne(taches, JOUR)
  assert.deepEqual(g[0].taches.map((x) => x.title), ['Un', 'Deux'])
})

test('aRelancer s allume dès qu une seule tâche du groupe est due', () => {
  const taches = [
    t({ title: 'Calme', attente_de: 'Bob', attente_depuis: '2026-09-14', relance_apres: 30 }),
    t({ title: 'Dépassée', attente_de: 'Bob', attente_depuis: '2026-09-01', relance_apres: 7 }),
  ]
  assert.equal(grouperParPersonne(taches, JOUR)[0].aRelancer, true)
})

test('les tâches cochées et sans destinataire sont exclues du groupement', () => {
  const taches = [
    t({ title: 'Faite', attente_de: 'Bob', attente_depuis: '2026-09-01', is_done: true }),
    t({ title: 'Libre', attente_depuis: '2026-09-01' }),
  ]
  const g = grouperParPersonne(taches, JOUR)
  assert.equal(g.length, 0)
  assert.equal(compterAttentes(g), 0)
})
