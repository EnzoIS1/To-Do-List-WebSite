/**
 * Vérification du chiffrement des notifications.
 *
 *   cd supabase/functions/envoyer-rappels
 *   npm install http_ece      (uniquement pour ce test — jamais en production)
 *   node webpush.test.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA MÉTHODE
 *
 * Un test qui chiffre puis déchiffre avec le même code ne prouve presque
 * rien : une erreur de dérivation présente des deux côtés se compense et le
 * test passe quand même, alors que le navigateur, lui, refuserait le message.
 *
 * On croise donc avec `http_ece`, la bibliothèque qu'utilise `web-push` —
 * dans les DEUX sens. Chiffrer ici et déchiffrer là-bas, puis l'inverse.
 * AES-GCM authentifie son contenu : si un seul octet de la clé ou du nonce
 * diffère entre les deux implémentations, le déchiffrement échoue. Réussir
 * les deux sens ne laisse pas de place à une erreur symétrique.
 *
 * Le seul point que ce test ne couvre pas est celui que je ne peux pas
 * couvrir d'ici : la réaction réelle du service de notification d'Apple.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { webcrypto, createECDH } from 'node:crypto'
import ece from 'http_ece'
import {
  chiffrer, dechiffrer, enteteVapid, genererClesVapid, versB64url, depuisB64url,
} from './webpush.js'

if (!globalThis.crypto) globalThis.crypto = webcrypto

/** http_ece attend un objet ECDH de Node ; on le reconstruit des octets bruts. */
function creerCleEC(priveeBrute) {
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(priveeBrute)
  return ecdh
}

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

/** Fabrique un faux abonnement, comme le navigateur en produirait un. */
async function faireAbonnement() {
  const paire = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const publique = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey))
  const jwk = await crypto.subtle.exportKey('jwk', paire.privateKey)
  const auth = crypto.getRandomValues(new Uint8Array(16))
  return {
    endpoint: 'https://web.push.apple.com/exemple',
    p256dh: versB64url(publique),
    auth: versB64url(auth),
    priveeJwk: jwk,
    // http_ece attend des Buffer Node bruts
    priveeBrute: Buffer.from(depuisB64url(jwk.d)),
    publiqueBrute: Buffer.from(publique),
    authBrut: Buffer.from(auth),
  }
}

console.log('\n1. Notre chiffrement, déchiffré par http_ece')
{
  const a = await faireAbonnement()
  const message = JSON.stringify({ titre: '3 rappels aujourd\'hui', corps: 'TP de SVT · Chapitre 3' })
  const corps = await chiffrer(message, a)

  // http_ece déchiffre avec la clé PRIVÉE du destinataire ; la clé publique de
  // l'expéditeur est lue dans l'en-tête du corps, comme le ferait un navigateur.
  let obtenu = null, erreur = null
  try {
    obtenu = ece.decrypt(Buffer.from(corps), {
      version: 'aes128gcm',
      privateKey: creerCleEC(a.priveeBrute),
      dh: a.publiqueBrute,
      authSecret: a.authBrut,
    }).toString()
  } catch (e) { erreur = e.message }

  ok('http_ece lit notre message', obtenu === message, erreur ?? `→ ${JSON.stringify(obtenu)}`)
  ok('le corps commence par le sel de 16 octets', corps.length > 21 + 65)
  ok('la taille d\'enregistrement annoncée est 4096',
    new DataView(corps.buffer, corps.byteOffset + 16, 4).getUint32(0, false) === 4096)
  ok('la longueur de clé annoncée est 65', corps[20] === 65)
  ok('la clé publique de l\'expéditeur est non compressée', corps[21] === 4)
}

console.log('\n2. Le chiffrement de http_ece, déchiffré par notre code')
{
  const a = await faireAbonnement()
  const message = 'Un seul rappel aujourd\'hui : rendre le TP de SVT'

  const paireServeur = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const pubServeur = Buffer.from(await crypto.subtle.exportKey('raw', paireServeur.publicKey))
  const jwkServeur = await crypto.subtle.exportKey('jwk', paireServeur.privateKey)

  const corps = ece.encrypt(Buffer.from(message), {
    version: 'aes128gcm',
    privateKey: creerCleEC(Buffer.from(depuisB64url(jwkServeur.d))),
    dh: a.publiqueBrute,
    authSecret: a.authBrut,
  })

  let obtenu = null, erreur = null
  try {
    obtenu = await dechiffrer(new Uint8Array(corps), { priveeJwk: a.priveeJwk, auth: a.auth })
  } catch (e) { erreur = e.message }
  ok('nous lisons le message de http_ece', obtenu === message, erreur ?? `→ ${JSON.stringify(obtenu)}`)
}

console.log('\n3. Le chiffrement ne se répète jamais')
{
  const a = await faireAbonnement()
  const un = await chiffrer('même texte', a)
  const deux = await chiffrer('même texte', a)
  ok('deux envois du même texte donnent deux corps différents',
    Buffer.compare(Buffer.from(un), Buffer.from(deux)) !== 0)
  ok('les sels diffèrent',
    Buffer.compare(Buffer.from(un.slice(0, 16)), Buffer.from(deux.slice(0, 16))) !== 0)
  ok('les clés éphémères diffèrent',
    Buffer.compare(Buffer.from(un.slice(21, 86)), Buffer.from(deux.slice(21, 86))) !== 0)
}

console.log('\n4. Un message altéré est rejeté')
{
  const a = await faireAbonnement()
  const corps = await chiffrer('contenu authentique', a)
  corps[corps.length - 5] ^= 0xff   // on retourne un bit du texte chiffré
  let rejete = false
  try { await dechiffrer(corps, { priveeJwk: a.priveeJwk, auth: a.auth }) }
  catch { rejete = true }
  ok('AES-GCM refuse un corps modifié', rejete)
}

console.log('\n5. L\'en-tête VAPID')
{
  const cles = await genererClesVapid()
  const entete = await enteteVapid(
    'https://web.push.apple.com/QRSTU', 'mailto:enzo@exemple.fr', cles, 1_788_600_000_000
  )
  ok('la forme est « vapid t=…, k=… »', /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/.test(entete), entete)

  const jeton = entete.slice(8).split(', k=')[0]
  const [enteteB64, revB64, signatureB64] = jeton.split('.')
  const revendications = JSON.parse(Buffer.from(depuisB64url(revB64)).toString())
  console.log('    revendications :', JSON.stringify(revendications))

  ok('l\'audience est l\'origine du point de terminaison, sans le chemin',
    revendications.aud === 'https://web.push.apple.com')
  ok('le sujet est repris tel quel', revendications.sub === 'mailto:enzo@exemple.fr')
  ok('l\'expiration est à 12 h, sous le plafond de 24 h imposé par la RFC 8292',
    revendications.exp === 1_788_600_000 + 12 * 3600 &&
    revendications.exp - 1_788_600_000 <= 24 * 3600)
  ok('l\'algorithme annoncé est ES256',
    JSON.parse(Buffer.from(depuisB64url(enteteB64)).toString()).alg === 'ES256')

  // La signature doit se vérifier avec la clé publique que nous transmettons
  // dans « k= » : c'est exactement ce que fait le service de notification.
  const pub = depuisB64url(cles.publique)
  const clePublique = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: versB64url(pub.slice(1, 33)), y: versB64url(pub.slice(33, 65)) },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
  )
  const valide = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, clePublique,
    depuisB64url(signatureB64), new TextEncoder().encode(`${enteteB64}.${revB64}`)
  )
  ok('la signature se vérifie avec la clé publique annoncée', valide)
  ok('la signature fait 64 octets (r||s brut, pas du DER)',
    depuisB64url(signatureB64).length === 64)
}

console.log('\n6. base64url')
{
  for (const n of [1, 2, 3, 16, 32, 65, 100]) {
    const octets = crypto.getRandomValues(new Uint8Array(n))
    const aller = versB64url(octets)
    ok(`aller-retour sur ${n} octets`,
      Buffer.compare(Buffer.from(depuisB64url(aller)), Buffer.from(octets)) === 0)
    ok(`pas de remplissage ni de caractère hors alphabet (${n})`, /^[A-Za-z0-9_-]*$/.test(aller))
  }
}

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
