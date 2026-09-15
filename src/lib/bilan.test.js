import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  debutDeSemaine, finDeSemaine, bilanDeLaPeriode, bilanEnTexte, compterBilan, jourDeCloture,
} from './bilan.js'

/* 2026-09-15 est un mardi. */

test('la semaine commence le lundi', () => {
  assert.equal(debutDeSemaine('2026-09-15'), '2026-09-14') // mardi -> lundi
  assert.equal(debutDeSemaine('2026-09-14'), '2026-09-14') // lundi -> lui-même
})

test('dimanche appartient à la semaine qui vient de finir', () => {
  // Le piège : getDay() vaut 0 le dimanche. Sans correction, le dimanche
  // ouvrirait une semaine et le bilan du vendredi disparaîtrait.
  assert.equal(debutDeSemaine('2026-09-20'), '2026-09-14') // dimanche
  assert.equal(finDeSemaine('2026-09-14'), '2026-09-20')
})

test('la semaine fait sept jours, même à cheval sur un mois', () => {
  assert.equal(debutDeSemaine('2026-10-01'), '2026-09-28')
  assert.equal(finDeSemaine('2026-10-01'), '2026-10-04')
})

const t = (titre, quand, faite = true) => ({
  id: titre, title: titre, is_done: faite, completed_at: quand,
})

test('seules les tâches terminées dans la période comptent', () => {
  const taches = [
    t('Dans la période', '2026-09-15T10:00:00Z'),
    t('Avant', '2026-09-10T10:00:00Z'),
    t('Après', '2026-09-25T10:00:00Z'),
    t('Pas faite', null, false),
    { id: 'x', title: 'Faite sans date', is_done: true, completed_at: null },
  ]
  const g = bilanDeLaPeriode(taches, '2026-09-14', '2026-09-20')
  assert.equal(compterBilan(g), 1)
  assert.equal(g[0].taches[0].title, 'Dans la période')
})

test('le groupement est par jour, du plus ancien au plus récent', () => {
  const taches = [
    t('Jeudi', '2026-09-17T09:00:00Z'),
    t('Mardi A', '2026-09-15T09:00:00Z'),
    t('Mardi B', '2026-09-15T18:00:00Z'),
  ]
  const g = bilanDeLaPeriode(taches, '2026-09-14', '2026-09-20')
  assert.deepEqual(g.map((x) => x.jour), ['2026-09-15', '2026-09-17'])
  assert.equal(g[0].taches.length, 2)
  assert.equal(compterBilan(g), 3)
})

test('les tâches d un même jour sont triées par titre', () => {
  const taches = [t('Zèbre', '2026-09-15T09:00:00Z'), t('Abeille', '2026-09-15T10:00:00Z')]
  const g = bilanDeLaPeriode(taches, '2026-09-14', '2026-09-20')
  assert.deepEqual(g[0].taches.map((x) => x.title), ['Abeille', 'Zèbre'])
})

test('jourDeCloture rend une date locale, pas la date UTC brute', () => {
  // On ne peut pas fixer le fuseau du test, mais on peut vérifier que le
  // résultat correspond bien à la date LOCALE de l'horodatage — donc que
  // le calcul ne se contente pas de couper la chaîne ISO.
  const iso = '2026-09-15T23:30:00Z'
  const attendu = new Date(iso)
  const local = [
    attendu.getFullYear(),
    String(attendu.getMonth() + 1).padStart(2, '0'),
    String(attendu.getDate()).padStart(2, '0'),
  ].join('-')
  assert.equal(jourDeCloture({ completed_at: iso }), local)
})

test('le texte est brut et lisible', () => {
  const g = bilanDeLaPeriode([t('Rendre le dossier', '2026-09-15T09:00:00Z')], '2026-09-14', '2026-09-20')
  const texte = bilanEnTexte(g)
  assert.match(texte, /2026-09-15/)
  assert.match(texte, /- Rendre le dossier/)
})

test('le texte mentionne la catégorie quand elle existe', () => {
  const g = bilanDeLaPeriode([t('Rendre le dossier', '2026-09-15T09:00:00Z')], '2026-09-14', '2026-09-20')
  assert.match(bilanEnTexte(g, () => 'IUT'), /\(IUT\)/)
})

test('un bilan vide le dit au lieu de rendre une chaîne vide', () => {
  assert.equal(bilanEnTexte([]), 'Rien de terminé sur la période.')
  assert.equal(compterBilan([]), 0)
})

/* ── Le premier jour de la semaine est réglable ─────────────────────── */

test('avec dimanche en tête, la semaine glisse d un cran', () => {
  // 2026-09-15 est un mardi. Lundi = 14, dimanche précédent = 13.
  assert.equal(debutDeSemaine('2026-09-15', 1), '2026-09-14')
  assert.equal(debutDeSemaine('2026-09-15', 7), '2026-09-13')
  assert.equal(finDeSemaine('2026-09-15', 7), '2026-09-19')
})

test('le jour choisi est à lui-même son début de semaine', () => {
  assert.equal(debutDeSemaine('2026-09-13', 7), '2026-09-13') // un dimanche
  assert.equal(debutDeSemaine('2026-09-14', 1), '2026-09-14') // un lundi
})

test('le dimanche bascule de semaine selon le réglage', () => {
  // C'est le cas qui distingue vraiment les deux conventions : le
  // dimanche 20 ferme la semaine du lundi 14, mais OUVRE celle du 20.
  assert.equal(debutDeSemaine('2026-09-20', 1), '2026-09-14')
  assert.equal(debutDeSemaine('2026-09-20', 7), '2026-09-20')
})

test('la semaine fait toujours sept jours, quel que soit le départ', () => {
  for (const premier of [1, 7]) {
    for (const jour of ['2026-09-13', '2026-09-15', '2026-09-20', '2026-10-01']) {
      const d = debutDeSemaine(jour, premier)
      const f = finDeSemaine(jour, premier)
      assert.ok(d <= jour && jour <= f, `${jour} hors de sa propre semaine (${premier})`)
    }
  }
})
