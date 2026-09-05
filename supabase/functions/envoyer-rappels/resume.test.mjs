/**
 * Vérification du texte de la notification groupée.
 *   node supabase/functions/envoyer-rappels/resume.test.mjs
 */
import { composerResume, TAILLE_MAX, ETIQUETTE } from './resume.js'

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

console.log('\n1. Le cas normal : une seule notification pour plusieurs rappels')
{
  const r = composerResume(['Rendre le TP de SVT', 'Réviser le chapitre 3', "Contrôle d'anglais"])
  console.log('   ', JSON.stringify(r))
  ok('le titre annonce le nombre', r.titre === '3 rappels aujourd\'hui')
  ok('le corps contient les trois tâches',
    r.corps === "Rendre le TP de SVT · Réviser le chapitre 3 · Contrôle d'anglais")
  ok('l\'étiquette est celle qui remplace au lieu d\'empiler', r.tag === ETIQUETTE)
}

console.log('\n2. Un seul rappel : pas de pluriel bancal')
{
  const r = composerResume(['Sortir la poubelle'])
  ok('« 1 rappel », au singulier', r.titre === "1 rappel aujourd'hui", r.titre)
  ok('le corps est la tâche elle-même', r.corps === 'Sortir la poubelle')
}

console.log('\n3. Aucun rappel : aucune notification')
{
  ok('liste vide → rien', composerResume([]) === null)
  ok('liste de blancs → rien', composerResume(['', '   ', null]) === null)
}

console.log('\n4. Beaucoup de rappels : le message reste envoyable')
{
  const beaucoup = Array.from({ length: 60 }, (_, i) => `Tâche numéro ${i + 1} de la journée`)
  const r = composerResume(beaucoup)
  console.log('    titre :', r.titre)
  console.log('    corps :', r.corps.slice(0, 120) + '…')
  console.log('    longueur du corps :', r.corps.length)
  ok('le titre compte TOUT le monde', r.titre === "60 rappels aujourd'hui")
  ok('le corps reste sous la limite', r.corps.length <= TAILLE_MAX, String(r.corps.length))
  ok('le reste est annoncé, pas escamoté', / … et \d+ autres$/.test(r.corps), r.corps.slice(-40))
  const annonces = Number(r.corps.match(/et (\d+) autres$/)[1])
  const listes = r.corps.split(' … ')[0].split(' · ').length
  ok('les comptes tombent juste', listes + annonces === 60, `${listes} + ${annonces}`)
}

console.log('\n5. Un titre interminable est coupé proprement')
{
  const long = 'Réviser le chapitre 3 sur les suites numériques, les limites, ' +
               'le raisonnement par récurrence et les théorèmes de comparaison'
  const r = composerResume([long, 'Autre tâche'])
  console.log('    corps :', r.corps)
  ok('il est raccourci', r.corps.length < long.length + 20)
  ok('il finit par des points de suspension, pas au milieu d\'un mot',
    /…/.test(r.corps) && !/\w…/.test(r.corps.split(' · ')[0].slice(0, -1)))
  ok('la tâche suivante est toujours là', r.corps.includes('Autre tâche'))
}

console.log('\n6. Un seul rappel très long tient quand même')
{
  const enorme = 'A'.repeat(3000)
  const r = composerResume([enorme])
  ok('le corps ne dépasse pas la limite', r.corps.length <= TAILLE_MAX, String(r.corps.length))
  ok('il reste lisible comme un seul rappel', r.titre === "1 rappel aujourd'hui")
}

console.log('\n7. Le lien du clic')
{
  ok('par défaut la racine', composerResume(['x']).url === '/')
  ok('sinon celui qu\'on donne',
    composerResume(['x'], 'https://enzois1.github.io/To-Do-List-WebSite/').url
      === 'https://enzois1.github.io/To-Do-List-WebSite/')
}

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
