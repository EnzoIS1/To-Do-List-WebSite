import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moduleActif, defautsDuMetier, nomDuMetier, MODULES } from './metiers.js'

test('un profil sans modules garde TOUT allumé', () => {
  // C'est le cas de tous les comptes existants avant la migration 0012 :
  // ils ne doivent rien perdre au premier chargement.
  for (const m of MODULES) {
    assert.equal(moduleActif({}, m.id), true, m.id)
    assert.equal(moduleActif(null, m.id), true, m.id)
    assert.equal(moduleActif(undefined, m.id), true, m.id)
  }
})

test('seul false éteint un module', () => {
  assert.equal(moduleActif({ revision: false }, 'revision'), false)
  assert.equal(moduleActif({ revision: true }, 'revision'), true)
  // Un module absent de l'objet reste allumé, même si d'autres sont réglés.
  assert.equal(moduleActif({ revision: false }, 'courses'), true)
})

test('une valeur abîmée ne casse rien', () => {
  assert.equal(moduleActif('nimporte quoi', 'revision'), true)
  assert.equal(moduleActif(42, 'revision'), true)
})

test('étudiant allume la révision, pas les autres métiers', () => {
  assert.equal(defautsDuMetier('etudiant').revision, true)
  assert.equal(defautsDuMetier('salarie').revision, false)
  assert.equal(defautsDuMetier('cadre').revision, false)
  assert.equal(defautsDuMetier('independant').revision, false)
})

test('un métier inconnu allume tout plutôt que rien', () => {
  const d = defautsDuMetier('astronaute')
  for (const m of MODULES) assert.equal(d[m.id], true, m.id)
})

test('les défauts couvrent TOUS les modules du catalogue', () => {
  // Sinon un module ajouté plus tard serait absent de l'objet écrit en
  // base, et se retrouverait allumé par défaut sans que le métier ait eu
  // son mot à dire. Le complément par TOUS_ALLUMES garantit la couverture.
  for (const metier of ['etudiant', 'salarie', 'cadre', 'independant']) {
    const d = defautsDuMetier(metier)
    for (const m of MODULES) {
      assert.equal(typeof d[m.id], 'boolean', `${metier} / ${m.id}`)
    }
  }
})

test('le nom du métier est lisible, et null si inconnu', () => {
  assert.equal(nomDuMetier('etudiant'), 'Étudiant')
  assert.equal(nomDuMetier(null), null)
  assert.equal(nomDuMetier('astronaute'), null)
})
