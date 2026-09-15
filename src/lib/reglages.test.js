import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  joursResume, resumeDesJours, categorieCoursesChoisie, emplacementDe,
  avecEmplacement, avecReglage, TOUS_LES_JOURS, EN_SEMAINE,
} from './reglages.js'

/* ── joursResume : la lecture doit être increvable ─────────────────── */

test('absent = tous les jours', () => {
  assert.deepEqual(joursResume({}), TOUS_LES_JOURS)
  assert.deepEqual(joursResume(null), TOUS_LES_JOURS)
  assert.deepEqual(joursResume(undefined), TOUS_LES_JOURS)
})

test('une valeur abîmée ne coupe jamais le résumé', () => {
  // Le pire défaut possible serait qu'un réglage cassé éteigne les
  // notifications en silence : on retombe sur « tous les jours ».
  assert.deepEqual(joursResume({ joursResume: 'lundi' }), TOUS_LES_JOURS)
  assert.deepEqual(joursResume({ joursResume: 42 }), TOUS_LES_JOURS)
  assert.deepEqual(joursResume({ joursResume: [] }), TOUS_LES_JOURS)
  assert.deepEqual(joursResume({ joursResume: [0, 8, 'x', null] }), TOUS_LES_JOURS)
})

test('les valeurs hors bornes sont écartées, les bonnes gardées', () => {
  assert.deepEqual(joursResume({ joursResume: [1, 5, 9, 0] }), [1, 5])
})

test('les doublons sont réduits et la liste triée', () => {
  assert.deepEqual(joursResume({ joursResume: [5, 1, 5, 1] }), [1, 5])
})

/* ── Les libellés ──────────────────────────────────────────────────── */

test('les cas courants ont un nom, pas une énumération', () => {
  assert.equal(resumeDesJours(TOUS_LES_JOURS), 'Tous les jours')
  assert.equal(resumeDesJours(EN_SEMAINE), 'En semaine')
  assert.equal(resumeDesJours([6, 7]), 'Le week-end')
  assert.equal(resumeDesJours([1, 3, 5]), 'Lun, Mer, Ven')
})

test('l ordre donné n influence pas le libellé', () => {
  assert.equal(resumeDesJours([5, 1, 3]), 'Lun, Mer, Ven')
})

/* ── La catégorie de courses ───────────────────────────────────────── */

test('sans choix explicite, on retombe sur la détection par le nom', () => {
  assert.equal(categorieCoursesChoisie({}), null)
  assert.equal(categorieCoursesChoisie({ categorieCourses: '' }), null)
  assert.equal(categorieCoursesChoisie({ categorieCourses: 42 }), null)
  assert.equal(categorieCoursesChoisie({ categorieCourses: 'abc-123' }), 'abc-123')
})

/* ── Les emplacements ──────────────────────────────────────────────── */

test('un emplacement absent ou inconnu vaut le tableau de bord', () => {
  assert.equal(emplacementDe({}, 'bilan'), 'tableau')
  assert.equal(emplacementDe({ emplacements: { bilan: 'nulle-part' } }, 'bilan'), 'tableau')
  assert.equal(emplacementDe({ emplacements: 'cassé' }, 'bilan'), 'tableau')
})

test('un emplacement valide est respecté', () => {
  assert.equal(emplacementDe({ emplacements: { bilan: 'page' } }, 'bilan'), 'page')
  assert.equal(emplacementDe({ emplacements: { bilan: 'aucun' } }, 'bilan'), 'aucun')
})

test('écrire un emplacement ne touche pas aux autres réglages', () => {
  const avant = { joursResume: [1, 2], emplacements: { attentes: 'page' } }
  const apres = avecEmplacement(avant, 'bilan', 'aucun')
  assert.deepEqual(apres.joursResume, [1, 2])
  assert.equal(apres.emplacements.attentes, 'page')
  assert.equal(apres.emplacements.bilan, 'aucun')
  // L'original n'est pas modifié : on réécrit, on ne mute pas.
  assert.equal(avant.emplacements.bilan, undefined)
})

test('écrire une clé ne touche pas au reste', () => {
  const avant = { joursResume: [1], emplacements: { bilan: 'page' } }
  const apres = avecReglage(avant, 'categorieCourses', 'abc')
  assert.equal(apres.categorieCourses, 'abc')
  assert.deepEqual(apres.joursResume, [1])
  assert.equal(apres.emplacements.bilan, 'page')
})

test('écrire par-dessus un sac abîmé ne plante pas', () => {
  assert.deepEqual(avecReglage(null, 'x', 1), { x: 1 })
  assert.deepEqual(avecEmplacement('cassé', 'bilan', 'page'), { emplacements: { bilan: 'page' } })
})
