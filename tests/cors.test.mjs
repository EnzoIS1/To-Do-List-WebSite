/**
 * Vérifie que la fonction serveur laisse le navigateur l'appeler.
 *
 *   # dans un terminal :
 *   cd supabase/functions/envoyer-rappels
 *   SUPABASE_URL=https://exemple.supabase.co SUPABASE_SERVICE_ROLE_KEY=x \
 *   CLE_PLANIFICATEUR=secret VAPID_PUBLIQUE=B VAPID_PRIVEE=x \
 *   deno run --allow-net --allow-env index.ts
 *
 *   # dans un autre :
 *   node tests/cors.test.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE TEST EXISTE
 *
 * Le bouton « Envoyer un essai » a renvoyé « Failed to fetch » à Enzo. Ce
 * message ne dit ni de quelle requête il s'agit, ni pourquoi elle a échoué —
 * il dit seulement que le navigateur n'a jamais obtenu de réponse.
 *
 * La cause : la fonction ne renvoyait aucun en-tête CORS. Or la requête
 * d'essai part du site vers une autre origine et porte un en-tête
 * Authorization, qui n'est pas un en-tête « simple ». Le navigateur envoie
 * donc d'abord une requête OPTIONS de contrôle préalable ; sans réponse
 * autorisant explicitement l'origine, la méthode et l'en-tête, il bloque
 * tout et n'envoie jamais la vraie requête.
 *
 * C'est le genre de défaut qu'un `deno check` ne voit pas, qu'un test
 * unitaire ne voit pas, et que je ne pouvais pas voir depuis mon
 * environnement : il n'apparaît que lorsqu'un vrai navigateur appelle une
 * vraie fonction. D'où ce test, qui rejoue le contrôle préalable à la main.
 * ─────────────────────────────────────────────────────────────────────────
 */
const BASE = process.env.URL_FONCTION ?? 'http://127.0.0.1:8000'
const ORIGINE = 'https://enzois1.github.io'

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

let preflight
try {
  preflight = await fetch(BASE, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGINE,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization',
    },
  })
} catch (e) {
  console.error(`\nImpossible de joindre ${BASE} — la fonction tourne-t-elle ?\n${e.message}\n`)
  process.exit(2)
}

console.log('\n1. Le contrôle préalable du navigateur')
{
  const origine = preflight.headers.get('access-control-allow-origin')
  const entetes = preflight.headers.get('access-control-allow-headers') ?? ''
  const methodes = preflight.headers.get('access-control-allow-methods') ?? ''
  console.log('    statut       :', preflight.status)
  console.log('    allow-origin :', origine ?? '(absent)')
  console.log('    allow-headers:', entetes || '(absent)')

  ok('OPTIONS répond sans erreur', preflight.status >= 200 && preflight.status < 300,
    String(preflight.status))
  ok('une origine est autorisée', Boolean(origine), '(en-tête absent)')
  ok('l\'en-tête Authorization est autorisé', /authorization/i.test(entetes), entetes)
  ok('la méthode POST est autorisée', /post/i.test(methodes), methodes)
  ok('le contrôle préalable n\'exige PAS de jeton',
    preflight.status !== 401 && preflight.status !== 403,
    'un 401 sur OPTIONS bloque tout : le navigateur ne peut pas s\'authentifier avant de demander la permission')
}

console.log('\n2. La requête réelle, sans jeton valide')
{
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { Origin: ORIGINE, Authorization: 'Bearer jeton-invalide' },
  })
  const texte = await r.text()
  console.log('    statut :', r.status)
  console.log('    corps  :', texte.slice(0, 120))

  ok('elle est refusée', r.status === 401, String(r.status))
  ok('elle porte AUSSI les en-têtes CORS',
    Boolean(r.headers.get('access-control-allow-origin')),
    'sans eux, le site reçoit « Failed to fetch » au lieu du message de refus')
  ok('le corps est du JSON lisible', (() => {
    try { return typeof JSON.parse(texte).erreur === 'string' } catch { return false }
  })(), texte.slice(0, 80))
  ok('il explique quoi vérifier', /Supabase|Reconnecte/.test(texte), texte.slice(0, 80))
}

console.log('\n3. La tâche planifiée sans la bonne clé est traitée comme un visiteur')
{
  const r = await fetch(BASE, {
    method: 'POST',
    headers: { 'x-cle-planificateur': 'mauvaise-cle' },
  })
  ok('refusée', r.status === 401, String(r.status))
  ok('et toujours avec CORS', Boolean(r.headers.get('access-control-allow-origin')))
}

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
