import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLONNES_PROFIL } from './colonnesProfil.js'

/*
 * Garde-fou du bug du 25 octobre 2026 : un champ lu sur le profil mais
 * absent du `select` vaut `undefined` après chaque chargement, sans aucune
 * erreur. On parcourt donc tout `src/` à la recherche de `profil.x` /
 * `profil?.x` et on exige que chaque `x` soit réellement chargé.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) return fichiers(chemin)
    return /\.(jsx?|mjs)$/.test(nom) && !nom.includes('.test.') ? [chemin] : []
  })
}

test('chaque champ lu sur le profil est chargé par useProfil', () => {
  const lus = new Map()
  for (const f of fichiers(SRC)) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bprofil\??\.([a-z_]+)/g)) {
      if (!lus.has(m[1])) lus.set(m[1], f.slice(SRC.length + 1))
    }
  }
  assert.ok(lus.size > 0, 'aucune lecture trouvée : le motif de recherche est cassé')
  const manquants = [...lus].filter(([champ]) => !COLONNES_PROFIL.includes(champ))
  assert.deepEqual(
    manquants, [],
    `Colonnes lues mais jamais chargées : ${manquants.map(([c, f]) => `${c} (${f})`).join(', ')}`,
  )
})

test('reglages est chargé — la cause du bug de la liste de courses', () => {
  assert.ok(COLONNES_PROFIL.includes('reglages'))
})
