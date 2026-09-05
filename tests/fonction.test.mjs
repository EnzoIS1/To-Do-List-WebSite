/**
 * Vérifie la fonction serveur en la faisant RÉELLEMENT tourner.
 *
 *   npm run test:fonction        (il faut Deno : npm install -g deno)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE TEST EXISTE
 *
 * Deux pannes de suite sont passées à travers `deno check`, `deno lint` et
 * tous les tests unitaires, parce qu'elles n'existent qu'au moment où la
 * fonction tourne pour de bon et répond à une requête :
 *
 *   1. « Failed to fetch » — la fonction ne renvoyait aucun en-tête CORS.
 *      Le navigateur bloquait le contrôle préalable et n'envoyait jamais
 *      la vraie requête.
 *   2. « Cannot read properties of undefined (reading 'replace') » — le
 *      secret VAPID_PUBLIQUE n'était pas renseigné. L'erreur venait du
 *      chiffrement, remontait telle quelle jusqu'au site, et ne disait ni
 *      quel réglage manquait ni où le mettre.
 *
 * Les deux se voient en trois secondes dès qu'on lance la fonction et qu'on
 * lui parle. Ce fichier le fait : il démarre `index.ts` dans Deno avec des
 * configurations volontairement cassées, et vérifie que chaque réponse
 * nomme précisément ce qui ne va pas.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), '..',
  'supabase', 'functions', 'envoyer-rappels')
const BASE = 'http://127.0.0.1:8000'   // le port par défaut de Deno.serve
const ORIGINE = 'https://enzois1.github.io'

const PUBLIQUE = 'BMqLanINWVW4ennfXl_IJuQaKjU7MEnkKgQXYP4SPxX1gAUS5ohTZMD47To83eFUrl2k4jND_9Ib00orD45RLTs'
const PRIVEE = 'kSvpXQ3Zx1cRfMHqBv8lNwYtGdJ2eA0iUoP7ZrCbTsE'
const COMPLETE = {
  SUPABASE_URL: 'https://exemple.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'cle-de-service',
  CLE_PLANIFICATEUR: 'secret-du-planificateur',
  VAPID_PUBLIQUE: PUBLIQUE,
  VAPID_PRIVEE: PRIVEE,
  SUJET_VAPID: 'mailto:enzo@exemple.fr',
  LIEN_SITE: 'https://enzois1.github.io/To-Do-List-WebSite/',
}

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

/** Démarre la fonction avec la configuration donnée, et l'arrête après. */
async function avecLaFonction(env, faire) {
  const enfant = spawn('deno', ['run', '--allow-net', '--allow-env', 'index.ts'], {
    cwd: DOSSIER,
    env: { ...process.env, ...env, DENO_NO_UPDATE_CHECK: '1' },
    stdio: 'ignore',
  })
  try {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250))
      try {
        const r = await fetch(BASE, { method: 'POST' })
        if (r) return await faire()
      } catch { /* pas encore prête */ }
    }
    throw new Error('la fonction n\'a pas démarré')
  } finally {
    enfant.kill('SIGKILL')
    await new Promise((r) => setTimeout(r, 200))
  }
}

const corpsDe = async (r) => { try { return await r.json() } catch { return {} } }

console.log('\n1. CORS — le contrôle préalable du navigateur')
await avecLaFonction(COMPLETE, async () => {
  const pre = await fetch(BASE, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGINE,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization',
    },
  })
  const entetes = pre.headers.get('access-control-allow-headers') ?? ''
  console.log('    statut', pre.status, '· allow-headers :', entetes || '(absent)')

  ok('OPTIONS répond sans erreur', pre.status >= 200 && pre.status < 300, String(pre.status))
  ok('le contrôle préalable n\'exige PAS de jeton', pre.status !== 401 && pre.status !== 403,
    'un 401 ici bloque tout : le navigateur ne peut pas s\'authentifier avant d\'avoir la permission')
  ok('une origine est autorisée', Boolean(pre.headers.get('access-control-allow-origin')))
  ok('l\'en-tête Authorization est autorisé', /authorization/i.test(entetes), entetes)
  ok('la méthode POST est autorisée',
    /post/i.test(pre.headers.get('access-control-allow-methods') ?? ''))

  const refus = await fetch(BASE, { method: 'POST', headers: { Authorization: 'Bearer faux' } })
  ok('un refus porte AUSSI les en-têtes CORS',
    Boolean(refus.headers.get('access-control-allow-origin')),
    'sans eux, le site reçoit « Failed to fetch » au lieu du message de refus')
  ok('et un corps JSON lisible', typeof (await corpsDe(refus)).erreur === 'string')
})

console.log('\n2. Configuration incomplète — chaque secret manquant est nommé')
for (const [cas, env, attendu] of [
  ['VAPID_PUBLIQUE absente',
    { ...COMPLETE, VAPID_PUBLIQUE: '' }, /VAPID_PUBLIQUE.*absent/],
  ['VAPID_PRIVEE absente',
    { ...COMPLETE, VAPID_PRIVEE: '' }, /VAPID_PRIVEE.*absent/],
  ['les deux absentes',
    { ...COMPLETE, VAPID_PUBLIQUE: '', VAPID_PRIVEE: '' }, /VAPID_PUBLIQUE.*VAPID_PRIVEE/s],
  ['clés interverties',
    { ...COMPLETE, VAPID_PUBLIQUE: PRIVEE, VAPID_PRIVEE: PUBLIQUE }, /as-tu collé la clé privée ici/],
  ['sujet sans mailto:',
    { ...COMPLETE, SUJET_VAPID: 'enzo@exemple.fr' }, /SUJET_VAPID/],
]) {
  await avecLaFonction(env, async () => {
    const r = await fetch(BASE, { method: 'POST', headers: { Authorization: 'Bearer x' } })
    const corps = await corpsDe(r)
    console.log(`    ${cas} → ${String(corps.detail ?? corps.erreur).slice(0, 110)}`)
    ok(`${cas} : refusé avec une explication`, r.status === 500 && attendu.test(corps.detail ?? ''),
      JSON.stringify(corps).slice(0, 160))
    ok(`${cas} : la réponse dit OÙ corriger`, /Edge Functions → Secrets/.test(corps.detail ?? ''))
    ok(`${cas} : aucune valeur de secret n'est divulguée`,
      !JSON.stringify(corps).includes(PRIVEE) && !JSON.stringify(corps).includes(PUBLIQUE))
  })
}

console.log('\n3. Configuration complète — on retombe sur le contrôle d\'accès normal')
await avecLaFonction(COMPLETE, async () => {
  const sansJeton = await fetch(BASE, { method: 'POST' })
  ok('sans jeton : refusé', sansJeton.status === 401, String(sansJeton.status))
  ok('et ce n\'est plus une erreur de configuration',
    !/configuration/.test(JSON.stringify(await corpsDe(sansJeton))))

  const mauvaiseCle = await fetch(BASE, {
    method: 'POST', headers: { 'x-cle-planificateur': 'pas-la-bonne' },
  })
  ok('mauvaise clé de planificateur : traitée comme un visiteur', mauvaiseCle.status === 401)
})

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
