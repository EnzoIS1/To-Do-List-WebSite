import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  avancer, occurrencesDues, libelleRythme, resumeRecurrence, PLAFOND_RATTRAPAGE,
} from './recurrence.js'

/* ── avancer : les jours et les semaines ───────────────────────────── */

test('un jour sur deux avance de deux jours', () => {
  assert.equal(avancer('2026-09-15', 2, 'jour'), '2026-09-17')
})

test('toutes les semaines avance de sept jours', () => {
  assert.equal(avancer('2026-09-15', 1, 'semaine'), '2026-09-22')
})

test('le passage de mois se fait correctement en jours', () => {
  assert.equal(avancer('2026-09-29', 3, 'jour'), '2026-10-02')
})

/* ── avancer : les mois, là où ça casse ────────────────────────────── */

test('tous les mois garde le quantième', () => {
  assert.equal(avancer('2026-01-15', 1, 'mois', '2026-01-15'), '2026-02-15')
})

test('le 31 janvier ne déborde pas sur mars', () => {
  // C'est le piège : new Date(2026, 1, 31) vaut le 3 mars.
  assert.equal(avancer('2026-01-31', 1, 'mois', '2026-01-31'), '2026-02-28')
})

test('le quantième revient après avoir été rabattu', () => {
  // Février a rabattu au 28 ; mars doit retrouver le 31, pas rester au 28.
  assert.equal(avancer('2026-02-28', 1, 'mois', '2026-01-31'), '2026-03-31')
})

test('février 2028 est bissextile', () => {
  assert.equal(avancer('2028-01-31', 1, 'mois', '2028-01-31'), '2028-02-29')
})

test('tous les trois mois franchit l année', () => {
  assert.equal(avancer('2026-11-10', 3, 'mois', '2026-11-10'), '2027-02-10')
})

/* ── occurrencesDues ───────────────────────────────────────────────── */

const sansFin = { debut: '2026-09-01', fin: null, prochaine: '2026-09-01', tous_les: 1, unite: 'semaine' }

test('rien à fabriquer si la prochaine est dans le futur', () => {
  const r = occurrencesDues({ ...sansFin, prochaine: '2026-09-20' }, '2026-09-15')
  assert.deepEqual(r.jours, [])
  assert.equal(r.prochaine, '2026-09-20')
  assert.equal(r.termine, false)
})

test('une occurrence due aujourd hui est fabriquée', () => {
  const r = occurrencesDues({ ...sansFin, prochaine: '2026-09-15' }, '2026-09-15')
  assert.deepEqual(r.jours, ['2026-09-15'])
  assert.equal(r.prochaine, '2026-09-22')
})

test('le retard est rattrapé en une fois', () => {
  const r = occurrencesDues({ ...sansFin, prochaine: '2026-09-01' }, '2026-09-22')
  assert.deepEqual(r.jours, ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'])
  assert.equal(r.prochaine, '2026-09-29')
})

test('une récurrence bornée s arrête à sa date de fin', () => {
  // « Tous les jours pendant une semaine » : 7 occurrences, puis terminé.
  const rec = { debut: '2026-09-01', fin: '2026-09-07', prochaine: '2026-09-01', tous_les: 1, unite: 'jour' }
  const r = occurrencesDues(rec, '2026-09-30')
  assert.equal(r.jours.length, 7)
  assert.equal(r.jours[0], '2026-09-01')
  assert.equal(r.jours[6], '2026-09-07')
  assert.equal(r.termine, true)
})

test('le plafond évite de fabriquer un an de retard', () => {
  const rec = { debut: '2025-01-01', fin: null, prochaine: '2025-01-01', tous_les: 1, unite: 'jour' }
  const r = occurrencesDues(rec, '2026-09-15')
  assert.equal(r.jours.length, PLAFOND_RATTRAPAGE)
  // Le curseur repart d'après aujourd'hui : le retard restant est sauté,
  // pas empilé pour la prochaine ouverture.
  assert.equal(r.prochaine, '2026-09-16')
})

test('rejouer après avoir avancé le curseur ne recrée rien', () => {
  // C'est la propriété qui protège des doublons entre deux onglets.
  const rec = { ...sansFin, prochaine: '2026-09-01' }
  const un = occurrencesDues(rec, '2026-09-15')
  const deux = occurrencesDues({ ...rec, prochaine: un.prochaine }, '2026-09-15')
  assert.deepEqual(deux.jours, [])
})

/* ── Les libellés ──────────────────────────────────────────────────── */

test('les rythmes courants se disent en français', () => {
  assert.equal(libelleRythme(1, 'jour'), 'Tous les jours')
  assert.equal(libelleRythme(2, 'jour'), 'Un jour sur deux')
  assert.equal(libelleRythme(1, 'semaine'), 'Toutes les semaines')
  assert.equal(libelleRythme(1, 'mois'), 'Tous les mois')
  assert.equal(libelleRythme(3, 'jour'), 'Tous les 3 jours')
  assert.equal(libelleRythme(2, 'semaine'), 'Toutes les 2 semaines')
})

test('le résumé compte les occurrences quand il y a une fin', () => {
  const rec = { debut: '2026-09-01', fin: '2026-09-07', tous_les: 1, unite: 'jour' }
  assert.match(resumeRecurrence(rec), /7 fois/)
})

test('le résumé sans fin ne compte pas', () => {
  assert.match(resumeRecurrence({ debut: '2026-09-01', fin: null, tous_les: 1, unite: 'mois' }), /sans fin/)
})

test('le résumé ne modifie pas la récurrence', () => {
  const rec = { debut: '2026-09-01', fin: '2026-09-07', prochaine: '2026-09-01', tous_les: 1, unite: 'jour' }
  resumeRecurrence(rec)
  assert.equal(rec.prochaine, '2026-09-01')
})
