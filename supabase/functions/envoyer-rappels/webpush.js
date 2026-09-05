/**
 * Notifications web : signature VAPID et chiffrement du message.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE PLUTÔT QU'UNE BIBLIOTHÈQUE
 *
 * La bibliothèque de référence (`web-push`, sur npm) est écrite pour Node et
 * s'appuie sur son module `crypto`. Les fonctions Supabase tournent sur Deno.
 * Ça peut marcher via la couche de compatibilité Node — mais « ça peut
 * marcher » n'est pas une base acceptable pour du code que je ne peux pas
 * exécuter dans l'environnement cible avant de le livrer.
 *
 * Tout ici n'utilise que la Web Crypto API, présente à l'identique dans Deno,
 * dans Node depuis la version 20 et dans les navigateurs. Zéro dépendance,
 * donc zéro surprise au déploiement — et surtout : le même code peut être
 * testé ici, en Node, contre une implémentation indépendante.
 *
 * C'est ce que fait webpush.test.mjs : il croise ce fichier avec `http_ece`
 * (la bibliothèque que `web-push` utilise elle-même) dans les DEUX sens.
 * Chiffrer avec l'un et déchiffrer avec l'autre ne peut pas réussir si la
 * dérivation de clés diffère d'un seul octet.
 *
 * Les deux normes suivies :
 *   RFC 8291 — Message Encryption for Web Push (chiffrement aes128gcm)
 *   RFC 8292 — VAPID (l'en-tête Authorization qui identifie le serveur)
 * ─────────────────────────────────────────────────────────────────────────
 */

const encodeur = new TextEncoder()

/* ─── base64url : l'alphabet de toutes ces normes ─── */

export function versB64url(octets) {
  let binaire = ''
  for (const o of new Uint8Array(octets)) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function depuisB64url(texte) {
  const complet = texte.replace(/-/g, '+').replace(/_/g, '/')
    // atob() refuse une chaîne dont la longueur n'est pas un multiple de 4 :
    // le base64url supprime le remplissage, on le remet.
    .padEnd(Math.ceil(texte.length / 4) * 4, '=')
  const binaire = atob(complet)
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0))
}

function concat(...morceaux) {
  const total = morceaux.reduce((n, m) => n + m.length, 0)
  const sortie = new Uint8Array(total)
  let i = 0
  for (const m of morceaux) { sortie.set(m, i); i += m.length }
  return sortie
}

/* ─── Dérivation de clés ─── */

/**
 * HKDF en une fois (extraction + expansion), tel que la Web Crypto le fournit.
 * RFC 8291 s'en sert deux fois de suite avec des sels différents : le secret
 * d'authentification de l'abonnement, puis le sel aléatoire du message.
 */
async function hkdf(ikm, sel, info, octets) {
  const cle = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sel, info }, cle, octets * 8
  )
  return new Uint8Array(bits)
}

/** Les deux clés du message : celle du chiffrement, et le nonce. */
async function cles({ secretPartage, auth, publiqueClient, publiqueServeur, sel }) {
  // « WebPush: info » lie les deux clés publiques au secret : un message
  // chiffré pour un abonnement ne peut pas être rejoué vers un autre.
  const infoCle = concat(
    encodeur.encode('WebPush: info'), new Uint8Array([0]),
    publiqueClient, publiqueServeur
  )
  const ikm = await hkdf(secretPartage, auth, infoCle, 32)

  const cek = await hkdf(ikm, sel, encodeur.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(ikm, sel, encodeur.encode('Content-Encoding: nonce\0'), 12)
  return { cek, nonce }
}

const importerPubliqueClient = (octets) =>
  crypto.subtle.importKey('raw', octets, { name: 'ECDH', namedCurve: 'P-256' }, true, [])

/* ─── Chiffrement ─── */

/**
 * Chiffre un message pour un abonnement, au format aes128gcm.
 *
 * @param {string} message              le contenu, en clair (du JSON chez nous)
 * @param {object} abonnement           { p256dh, auth } en base64url, tels que
 *                                      le navigateur les a fournis
 * @param {Uint8Array} [selFixe]        sel imposé — réservé aux tests
 * @param {CryptoKeyPair} [paireFixe]   paire éphémère imposée — idem
 * @returns {Promise<Uint8Array>} le corps de la requête HTTP
 */
export async function chiffrer(message, abonnement, selFixe = null, paireFixe = null) {
  const publiqueClientOctets = depuisB64url(abonnement.p256dh)
  const auth = depuisB64url(abonnement.auth)

  // Une paire de clés NEUVE par message : c'est ce qui rend chaque envoi
  // indéchiffrable à partir du précédent.
  const paire = paireFixe ?? await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const publiqueServeur = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey))

  const secretPartage = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await importerPubliqueClient(publiqueClientOctets) },
    paire.privateKey, 256
  ))

  const sel = selFixe ?? crypto.getRandomValues(new Uint8Array(16))
  const { cek, nonce } = await cles({
    secretPartage, auth, publiqueClient: publiqueClientOctets, publiqueServeur, sel,
  })

  // Un seul enregistrement : le texte est suivi de l'octet 0x02, qui signale
  // « dernier enregistrement ». Avec 0x01 le client attendrait une suite et
  // rejetterait le message.
  const contenu = concat(encodeur.encode(message), new Uint8Array([2]))

  const cleAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, cleAes, contenu
  ))

  // En-tête du corps, imposé par la RFC 8188 :
  //   sel (16) | taille d'enregistrement (4, gros-boutiste) | 65 | clé publique (65)
  const tailleEnregistrement = new Uint8Array(4)
  new DataView(tailleEnregistrement.buffer).setUint32(0, 4096, false)

  return concat(sel, tailleEnregistrement, new Uint8Array([65]), publiqueServeur, chiffre)
}

/**
 * Déchiffre un corps aes128gcm. N'est PAS utilisé en production — c'est le
 * navigateur qui déchiffre. Cette fonction existe pour que les tests puissent
 * vérifier le chiffrement d'une bibliothèque indépendante avec notre code, et
 * inversement.
 *
 * @param {Uint8Array} corps
 * @param {object} destinataire { priveeJwk, auth }
 */
export async function dechiffrer(corps, { priveeJwk, auth }) {
  const sel = corps.slice(0, 16)
  const longueurCle = corps[20]
  const publiqueServeur = corps.slice(21, 21 + longueurCle)
  const chiffre = corps.slice(21 + longueurCle)

  const privee = await crypto.subtle.importKey(
    'jwk', priveeJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']
  )
  // La clé publique du destinataire se reconstruit depuis son JWK : 0x04
  // suivi des coordonnées x et y, non compressées.
  const publiqueClientOctets = concat(
    new Uint8Array([4]), depuisB64url(priveeJwk.x), depuisB64url(priveeJwk.y)
  )

  const secretPartage = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await importerPubliqueClient(publiqueServeur) }, privee, 256
  ))

  const { cek, nonce } = await cles({
    secretPartage, auth: depuisB64url(auth),
    publiqueClient: publiqueClientOctets, publiqueServeur, sel,
  })

  const cleAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const contenu = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, cleAes, chiffre
  ))

  // On retire l'octet de fin, et le remplissage éventuel qui le précède.
  let fin = contenu.length - 1
  while (fin >= 0 && contenu[fin] === 0) fin--
  return new TextDecoder().decode(contenu.slice(0, fin))
}

/* ─── VAPID : l'en-tête qui identifie le serveur ─── */

/**
 * Construit l'en-tête Authorization d'un envoi.
 *
 * VAPID ne chiffre rien : il prouve au service de notification (celui d'Apple
 * pour un iPhone, celui de Google pour Android) que l'envoi vient bien du
 * serveur qui détient la clé privée associée à la clé publique connue du
 * navigateur. C'est ce qui empêche n'importe qui d'inonder un abonnement dont
 * il aurait intercepté l'adresse.
 *
 * @param {string} pointDeTerminaison  l'URL d'envoi de l'abonnement
 * @param {string} sujet               'mailto:…' — un contact joignable
 * @param {object} clesVapid           { publique, privee } en base64url
 * @param {number} [maintenant]        horodatage imposé, pour les tests
 */
export async function enteteVapid(pointDeTerminaison, sujet, clesVapid, maintenant = Date.now()) {
  const origine = new URL(pointDeTerminaison).origin
  const entete = { typ: 'JWT', alg: 'ES256' }
  const revendications = {
    aud: origine,
    // La RFC 8292 plafonne à 24 h. On prend 12 h : assez large pour ne jamais
    // expirer pendant un envoi, assez court pour qu'un jeton qui fuiterait ne
    // serve pas longtemps.
    exp: Math.floor(maintenant / 1000) + 12 * 60 * 60,
    sub: sujet,
  }

  const aSigner = `${versB64url(encodeur.encode(JSON.stringify(entete)))}.` +
                  `${versB64url(encodeur.encode(JSON.stringify(revendications)))}`

  const privee = await importerPriveeVapid(clesVapid)
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privee, encodeur.encode(aSigner)
  ))

  return `vapid t=${aSigner}.${versB64url(signature)}, k=${clesVapid.publique}`
}

/** La clé privée VAPID est stockée en base64url brut : on la remonte en JWK. */
function importerPriveeVapid({ publique, privee }) {
  const pub = depuisB64url(publique)
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    x: versB64url(pub.slice(1, 33)),
    y: versB64url(pub.slice(33, 65)),
    d: privee,
  }
  return crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
}

/** Génère une paire VAPID. À lancer UNE fois, puis à conserver précieusement. */
export async function genererClesVapid() {
  const paire = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  )
  const jwk = await crypto.subtle.exportKey('jwk', paire.privateKey)
  const publique = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey))
  return { publique: versB64url(publique), privee: jwk.d }
}

/* ─── L'envoi lui-même ─── */

/**
 * Envoie un message à un abonnement.
 *
 * @returns {Promise<{ok: boolean, statut: number, mort: boolean, detail: string|null}>}
 *          `mort` vaut vrai sur 404 ou 410 : l'abonnement n'existe plus et il
 *          faut le supprimer de la base, sinon on réessaiera tous les jours.
 *          `detail` reprend le début du corps de la réponse en cas d'échec —
 *          c'est ce qui atterrit dans le journal des envois.
 */
export async function envoyer(abonnement, message, clesVapid, sujet, dureeVie = 12 * 60 * 60) {
  const corps = await chiffrer(message, abonnement)
  const reponse = await fetch(abonnement.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(dureeVie),
      Urgency: 'normal',
      Authorization: await enteteVapid(abonnement.endpoint, sujet, clesVapid),
    },
    body: corps,
  })
  return {
    ok: reponse.ok,
    statut: reponse.status,
    mort: reponse.status === 404 || reponse.status === 410,
    detail: reponse.ok ? null : (await reponse.text().catch(() => '')).slice(0, 300),
  }
}
