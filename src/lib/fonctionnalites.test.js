import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FONCTIONNALITES, fonctionActive, defautsDuMetier, fonctionsDuMetier, nomDuMetier,
} from './fonctionnalites.js'

const base = FONCTIONNALITES.filter((f) => f.base).map((f) => f.id)
const optionnelles = FONCTIONNALITES.filter((f) => !f.base).map((f) => f.id)

test('la base est active quoi qu il arrive', () => {
  for (const id of base) {
    assert.equal(fonctionActive({}, null, id), true, id)
    assert.equal(fonctionActive({ [id]: false }, 'cadre', id), true, `${id} ne doit pas pouvoir s'éteindre`)
    assert.equal(fonctionActive(null, 'etudiant', id), true, id)
  }
})

test('sans métier choisi, tout est allumé', () => {
  // Les comptes d'avant cette page ne doivent rien perdre.
  for (const id of optionnelles) assert.equal(fonctionActive({}, null, id), true, id)
})

test('le métier décide quand rien n est réglé à la main', () => {
  assert.equal(fonctionActive({}, 'etudiant', 'revision'), true)
  assert.equal(fonctionActive({}, 'salarie', 'revision'), false)
  assert.equal(fonctionActive({}, 'salarie', 'bilan'), true)
  assert.equal(fonctionActive({}, 'etudiant', 'bilan'), false)
})

test('un choix explicite l emporte sur le métier', () => {
  // Le salarié qui prépare une certification veut le mode révision.
  assert.equal(fonctionActive({ revision: true }, 'salarie', 'revision'), true)
  // Et l'étudiant qui ne révise pas peut l'éteindre.
  assert.equal(fonctionActive({ revision: false }, 'etudiant', 'revision'), false)
})

test('une fonctionnalité inconnue est inactive, jamais une erreur', () => {
  assert.equal(fonctionActive({}, 'etudiant', 'telepathie'), false)
})

test('les défauts couvrent toutes les optionnelles, et seulement elles', () => {
  const d = defautsDuMetier('etudiant')
  assert.deepEqual(Object.keys(d).sort(), [...optionnelles].sort())
  for (const v of Object.values(d)) assert.equal(typeof v, 'boolean')
})

test('chaque optionnelle appartient à au moins un métier', () => {
  // Sinon elle serait invisible pour tout le monde dès qu'un métier est choisi.
  for (const f of FONCTIONNALITES.filter((x) => !x.base)) {
    assert.ok((f.metiers ?? []).length > 0, `${f.id} n'est proposée par aucun métier`)
  }
})

test('chaque métier débloque au moins une fonctionnalité', () => {
  // Un métier qui n'ajoute rien n'aurait aucune raison d'être proposé.
  for (const m of ['etudiant', 'salarie', 'cadre', 'independant']) {
    assert.ok(fonctionsDuMetier(m).length > 0, `${m} ne débloque rien`)
  }
})

test('toute fonctionnalité a un résumé et un détail', () => {
  // C'est la page Fonctionnalités qui les affiche : une entrée sans texte
  // y apparaîtrait comme une case vide.
  for (const f of FONCTIONNALITES) {
    assert.ok(f.nom && f.resume && f.detail, f.id)
  }
})

test('les identifiants sont uniques', () => {
  const ids = FONCTIONNALITES.map((f) => f.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('le nom du métier est lisible, et null si inconnu', () => {
  assert.equal(nomDuMetier('etudiant'), 'Étudiant')
  assert.equal(nomDuMetier('astronaute'), null)
})

test('courses et notes sont optionnelles mais allumées pour TOUS les métiers', () => {
  // Elles ont quitté la base pour devenir réglables — mais personne ne
  // doit les perdre au passage : tout métier les allume par défaut.
  for (const id of ['courses', 'notes']) {
    const f = FONCTIONNALITES.find((x) => x.id === id)
    assert.equal(f.base, undefined, `${id} ne doit plus être de base`)
    for (const metier of ['etudiant', 'salarie', 'cadre', 'independant']) {
      assert.equal(fonctionActive({}, metier, id), true, `${id} éteinte pour ${metier}`)
    }
  }
})

test('toute fonctionnalité avec un panneau a un identifiant de panneau', () => {
  // `panneau` est ce qui rend l'emplacement réglable : une fonctionnalité
  // affichée sur le tableau de bord sans cet identifiant serait coincée là.
  for (const f of FONCTIONNALITES.filter((x) => x.panneau)) {
    assert.equal(typeof f.panneau, 'string')
    assert.ok(f.panneau.length > 0, f.id)
  }
})
