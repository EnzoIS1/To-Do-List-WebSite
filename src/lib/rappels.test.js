/**
 * node src/lib/rappels.test.js
 *
 * Le libellé est ce que l'utilisateur lit à la place d'une date : s'il se
 * trompe d'un jour, il ment. D'où les cas limites — le jour même, un écart
 * inconnu, une tâche sans échéance — et un aller-retour avec le menu :
 * ce que la puce « 3 jours avant » pose doit se relire « 3 jours avant ».
 */
import assert from 'node:assert/strict'
import {
  DECALAGES_RAPPEL, jourDuRappel, libelleRappel, detailRappel,
} from './rappels.js'

let n = 0
const test = (nom, fn) => { fn(); n++; console.log(`  ok   ${nom}`) }

test('les décalages connus se relisent avec le nom de leur puce', () => {
  for (const d of DECALAGES_RAPPEL) {
    const jour = jourDuRappel('2026-09-20', d.jours)
    assert.equal(libelleRappel(jour, '2026-09-20'), d.nom)
  }
})

test('le jour de l\'échéance', () => {
  assert.equal(libelleRappel('2026-09-20', '2026-09-20'), 'Le jour même')
})

test('un écart quelconque est décrit tel quel', () => {
  assert.equal(libelleRappel('2026-09-15', '2026-09-20'), '5 jours avant')
  assert.equal(libelleRappel('2026-08-30', '2026-09-20'), '3 semaines avant')
})

test('un rappel après l\'échéance n\'est pas décrit comme un « avant »', () => {
  assert.equal(libelleRappel('2026-09-22', '2026-09-20'), '2 jours après')
})

test('sans échéance, il n\'y a rien à mesurer', () => {
  assert.equal(libelleRappel('2026-09-20', null), 'Jour choisi')
})

test('le changement de mois ne décale pas le compte', () => {
  assert.equal(libelleRappel('2026-08-31', '2026-09-01'), 'La veille')
})

test('le détail signale un rappel automatique', () => {
  const tache = { due_date: '2026-09-20' }
  assert.equal(detailRappel({ remind_on: '2026-09-19', auto: true }, tache),
    'La veille · automatique')
  assert.equal(detailRappel({ remind_on: '2026-09-19', auto: false }, tache),
    'La veille')
})

console.log(`\n✓ ${n} tests passés.\n`)
