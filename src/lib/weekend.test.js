import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weekEndAvant, libelleRappel } from './rappels.js'

/*
 * Repères : 2026-10-05 est un lundi, donc
 *   samedi 2026-10-03, dimanche 2026-10-04,
 *   samedi 2026-09-26, dimanche 2026-09-27.
 */

test('un rendu le lundi est annoncé par le week-end de la veille', () => {
  assert.deepEqual(weekEndAvant('2026-10-05'), { samedi: '2026-10-03', dimanche: '2026-10-04' })
})

test('un rendu en milieu de semaine remonte au week-end précédent', () => {
  assert.deepEqual(weekEndAvant('2026-10-07'), { samedi: '2026-10-03', dimanche: '2026-10-04' })
  assert.deepEqual(weekEndAvant('2026-10-09'), { samedi: '2026-10-03', dimanche: '2026-10-04' })
})

test('un rendu le samedi remonte au week-end d AVANT, pas à lui-même', () => {
  // C'est le cas qui justifie la règle « strictement avant » : un rappel
  // le jour de l'échéance ne laisse aucun temps pour travailler.
  assert.deepEqual(weekEndAvant('2026-10-10'), { samedi: '2026-10-03', dimanche: '2026-10-04' })
})

test('un rendu le dimanche remonte aussi au week-end d avant', () => {
  assert.deepEqual(weekEndAvant('2026-10-11'), { samedi: '2026-10-03', dimanche: '2026-10-04' })
})

test('le dimanche rendu est toujours strictement avant l échéance', () => {
  // La propriété qui compte, vérifiée sur un mois entier.
  for (let j = 1; j <= 31; j++) {
    const echeance = `2026-10-${String(j).padStart(2, '0')}`
    const { samedi, dimanche } = weekEndAvant(echeance)
    assert.ok(dimanche < echeance, `${echeance} : dimanche ${dimanche} pas avant`)
    assert.ok(samedi < dimanche, `${echeance} : samedi après dimanche`)
  }
})

test('les deux jours sont bien un samedi et un dimanche', () => {
  for (let j = 1; j <= 31; j++) {
    const echeance = `2026-10-${String(j).padStart(2, '0')}`
    const { samedi, dimanche } = weekEndAvant(echeance)
    assert.equal(new Date(`${samedi}T12:00:00`).getDay(), 6, `${samedi} n'est pas un samedi`)
    assert.equal(new Date(`${dimanche}T12:00:00`).getDay(), 0, `${dimanche} n'est pas un dimanche`)
  }
})

test('le passage d un mois à l autre ne casse rien', () => {
  // 2026-11-02 est un lundi : le week-end d'avant est à cheval sur octobre.
  assert.deepEqual(weekEndAvant('2026-11-02'), { samedi: '2026-10-31', dimanche: '2026-11-01' })
})

test('les rappels du week-end se reconnaissent à leur intitulé', () => {
  // Sans ce cas particulier, ils s'afficheraient « 6 jours avant » pour un
  // rendu le vendredi et « 3 jours avant » pour un mardi : impossible de
  // relier le rappel au bouton qui l'a posé.
  const e = '2026-10-09' // un vendredi
  assert.equal(libelleRappel('2026-10-03', e), "Samedi d'avant")
  assert.equal(libelleRappel('2026-10-04', e), "Dimanche d'avant")
})

test('un décalage connu garde son nom, même s il tombe un week-end', () => {
  // La veille d'un rendu le dimanche EST un samedi : « La veille » reste
  // plus précis et doit l'emporter.
  assert.equal(libelleRappel('2026-10-10', '2026-10-11'), 'La veille')
})
