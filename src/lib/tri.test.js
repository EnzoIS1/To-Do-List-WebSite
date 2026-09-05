/** Vérification des tris.   node src/lib/tri.test.js */
import { trierTaches, TRIS } from './tri.js'

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

const t = (id, title, due_date, is_done = false, created_at = '2026-01-0' + id) =>
  ({ id, title, due_date, is_done, created_at })

const LISTE = [
  t('3', 'Zoologie', '2026-09-20'),
  t('1', 'Anglais', '2026-09-10'),
  t('4', 'École buissonnière', null),
  t('2', 'Maths', '2026-09-15'),
  t('5', 'Bricolage', '2026-09-05', true),
]

const noms = (l) => l.map((x) => x.title)

console.log('\n1. Du plus proche')
{
  const r = trierTaches(LISTE, 'proche')
  console.log('   ', noms(r).join(' → '))
  ok('les dates montent', noms(r).slice(0, 3).join() === 'Anglais,Maths,Zoologie')
  ok('la tâche sans date passe après celles qui en ont une',
    r.findIndex((x) => x.title === 'École buissonnière') === 3)
  ok('la tâche faite est tout en bas', r.at(-1).title === 'Bricolage')
}

console.log('\n2. Du plus lointain')
{
  const r = trierTaches(LISTE, 'lointain')
  console.log('   ', noms(r).join(' → '))
  ok('les dates descendent', noms(r).slice(0, 3).join() === 'Zoologie,Maths,Anglais')
  ok('la sans-date reste après les datées',
    r.findIndex((x) => x.title === 'École buissonnière') === 3)
  ok('la faite reste en bas', r.at(-1).title === 'Bricolage')
}

console.log('\n3. Alphabétique, avec les accents français')
{
  const r = trierTaches(LISTE, 'alpha')
  console.log('   ', noms(r).join(' → '))
  ok('« École » se range à la lettre E, pas après Z',
    noms(r).slice(0, 4).join() === 'Anglais,École buissonnière,Maths,Zoologie',
    noms(r).join(','))
  ok('la faite reste en bas', r.at(-1).title === 'Bricolage')
}

console.log('\n4. Ordre d\'ajout')
{
  const r = trierTaches(LISTE, 'ajout')
  console.log('   ', noms(r).join(' → '))
  ok('c\'est l\'ordre de création', noms(r).slice(0, 4).join() === 'Anglais,Maths,Zoologie,École buissonnière')
}

console.log('\n5. Propriétés valables pour TOUS les tris')
{
  for (const { id, nom } of TRIS) {
    const r = trierTaches(LISTE, id)
    ok(`${nom} : aucune tâche perdue ni dupliquée`,
      r.length === LISTE.length && new Set(r.map((x) => x.id)).size === LISTE.length)
    ok(`${nom} : la liste d'origine n'est pas modifiée`,
      noms(LISTE).join() === 'Zoologie,Anglais,École buissonnière,Maths,Bricolage')
    ok(`${nom} : les faites sont toutes après les non faites`,
      r.findIndex((x) => x.is_done) === -1 || r.slice(r.findIndex((x) => x.is_done)).every((x) => x.is_done))
    // Deux appels de suite doivent donner exactement le même ordre.
    ok(`${nom} : le résultat est stable`,
      noms(trierTaches(LISTE, id)).join() === noms(r).join())
  }
}

console.log('\n6. Cas limites')
{
  ok('liste vide', trierTaches([], 'proche').length === 0)
  ok('tri inconnu → comme « du plus proche »',
    noms(trierTaches(LISTE, 'nimportequoi')).join() === noms(trierTaches(LISTE, 'proche')).join())
  const sansTitre = [{ id: 'a', is_done: false }, { id: 'b', is_done: false }]
  ok('des tâches sans titre ne font pas planter le tri alphabétique',
    trierTaches(sansTitre, 'alpha').length === 2)
}

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
