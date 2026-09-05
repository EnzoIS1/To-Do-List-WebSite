import { supabase } from './supabase'

/**
 * Côté site : demander l'autorisation, s'abonner, se réabonner.
 *
 * Le point délicat n'est pas l'abonnement initial, c'est sa DURÉE DE VIE.
 * Un abonnement peut disparaître sans prévenir — navigateur qui vide son
 * stockage, service de notification qui fait tourner ses clés, icône
 * retirée puis remise sur l'écran d'accueil. La ligne en base devient alors
 * une adresse morte, et les rappels s'arrêtent en silence.
 *
 * D'où `synchroniser()`, appelée à CHAQUE ouverture du site : on relit
 * l'abonnement réel auprès du navigateur et on réécrit la base à partir de
 * lui, plutôt que de faire confiance à ce qu'on y avait mis la dernière fois.
 */

const CLE_PUBLIQUE = import.meta.env.VITE_VAPID_PUBLIQUE ?? ''

/**
 * Une clé publique VAPID est un point non compressé sur la courbe P-256 :
 * 65 octets, soit 87 caractères en base64url, et le premier octet vaut 0x04
 * — ce qui donne toujours un « B » en tête. Vérifier la forme ici évite un
 * échec incompréhensible plus tard : `applicationServerKey` refuse une clé
 * mal formée avec un message que personne ne peut relier à un .env oublié.
 */
export function cleVapidValide(cle = CLE_PUBLIQUE) {
  return typeof cle === 'string' && /^[A-Za-z0-9_-]{86,88}$/.test(cle) && cle.startsWith('B')
}

export const CLE_VAPID = CLE_PUBLIQUE

/** base64url → Uint8Array, ce qu'attend `applicationServerKey`. */
function versOctets(base64url) {
  const complet = base64url.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  const binaire = atob(complet)
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0))
}

/** L'inverse, pour ranger en base ce que le navigateur nous donne. */
function versB64url(buffer) {
  let binaire = ''
  for (const o of new Uint8Array(buffer)) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * La clé publique avec laquelle CET abonnement a été créé.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LE PIÈGE QU'ELLE SERT À DÉTECTER
 *
 * Un abonnement est lié à VIE à la clé publique passée au moment où le
 * navigateur s'est abonné. Le service de notification refuse ensuite tout
 * envoi signé par une autre clé — c'est ce qui produit « 403 invalid JWT »
 * chez Google et « BadJwtToken » chez Apple.
 *
 * Autrement dit : regénérer les clés VAPID invalide silencieusement tous
 * les abonnements existants. Rien ne le signale, la ligne en base a l'air
 * parfaitement valide, et les envois échouent sans qu'on comprenne
 * pourquoi. D'où cette lecture, qui permet de comparer et de se réabonner
 * tout seul.
 *
 * Renvoie null si le navigateur n'expose pas l'information — on ne peut
 * alors ni confirmer ni infirmer, et il ne faut surtout pas se réabonner
 * « au cas où » : ça bouclerait à chaque ouverture.
 * ─────────────────────────────────────────────────────────────────────
 */
export function cleDeLAbonnement(abonnement) {
  const brute = abonnement?.options?.applicationServerKey
  if (!brute) return null
  try { return versB64url(brute) } catch { return null }
}

/** Le navigateur sait-il faire des notifications web ? */
export function notificationsPossibles() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

/** Le site tourne-t-il depuis l'écran d'accueil plutôt que dans un onglet ? */
export function installeSurEcranAccueil() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

/** Un iPhone ou un iPad — là où l'écran d'accueil est OBLIGATOIRE. */
export function estAppareilApple() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) ||
    // Depuis iPadOS 13, un iPad se présente comme un Mac ; le tactile le trahit.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export const etatAutorisation = () =>
  notificationsPossibles() ? Notification.permission : 'unsupported'

/** Enregistre le service worker. Sans lui, aucun abonnement n'est possible. */
export async function enregistrerServiceWorker() {
  if (!notificationsPossibles()) return null
  // `import.meta.env.BASE_URL` vaut '/To-Do-List-WebSite/' en production et
  // '/' en développement : le chemin suit tout seul.
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
  })
}

/** Range un abonnement en base, en écrasant celui qui portait la même adresse. */
async function enregistrerEnBase(abonnement, userId) {
  const brut = abonnement.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: abonnement.endpoint,
    p256dh: brut.keys?.p256dh ?? versB64url(abonnement.getKey('p256dh')),
    auth: brut.keys?.auth ?? versB64url(abonnement.getKey('auth')),
    appareil: nomAppareil(),
  }, { onConflict: 'endpoint' })
  return error
}

function nomAppareil() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'PC'
  return 'Navigateur'
}

/**
 * Active les notifications : autorisation, abonnement, enregistrement.
 *
 * @returns {Promise<{ok: boolean, raison?: string}>}
 */
export async function activerNotifications(userId) {
  if (!notificationsPossibles()) {
    return { ok: false, raison: 'Ce navigateur ne sait pas afficher de notifications.' }
  }
  if (!CLE_PUBLIQUE) {
    return {
      ok: false,
      raison: "La clé publique VAPID manque : elle n'était pas là quand le site " +
        'a été compilé. En local, mets VITE_VAPID_PUBLIQUE dans .env.local et ' +
        'relance npm run dev — Vite ne relit pas ce fichier à chaud. En ligne, ' +
        'il faut la variable GitHub Actions ET la ligne correspondante dans le ' +
        'workflow, puis un nouveau push.',
    }
  }
  if (!cleVapidValide()) {
    return {
      ok: false,
      raison: `La clé publique VAPID est mal formée (${CLE_PUBLIQUE.length} caractères, ` +
        'il en faut 87 commençant par « B »). Relance node outils/cles-vapid.mjs ' +
        'et recopie la clé PUBLIQUE, sans espace ni retour à la ligne.',
    }
  }
  if (estAppareilApple() && !installeSurEcranAccueil()) {
    return {
      ok: false,
      raison: "Sur iPhone, les notifications n'existent que si le site est ajouté à " +
        "l'écran d'accueil. Partager → « Sur l'écran d'accueil », puis rouvre le site " +
        'depuis cette icône.',
    }
  }

  // La demande d'autorisation DOIT partir d'un geste de l'utilisateur : un
  // navigateur refuse en silence une demande faite au chargement de la page.
  const reponse = await Notification.requestPermission()
  if (reponse !== 'granted') {
    return {
      ok: false,
      raison: reponse === 'denied'
        ? 'Les notifications ont été refusées. Il faut les réautoriser dans les réglages du navigateur.'
        : 'Autorisation non accordée.',
    }
  }

  const enregistrement = await enregistrerServiceWorker()
  await navigator.serviceWorker.ready

  const abonnement = await enregistrement.pushManager.subscribe({
    // Obligatoire pour tous les navigateurs actuels : pas de notification
    // sans contenu visible.
    userVisibleOnly: true,
    applicationServerKey: versOctets(CLE_PUBLIQUE),
  })

  const erreur = await enregistrerEnBase(abonnement, userId)
  return erreur ? { ok: false, raison: erreur.message } : { ok: true }
}

/** Coupe les notifications sur CET appareil, sans toucher aux autres. */
export async function desactiverNotifications() {
  if (!notificationsPossibles()) return
  const enregistrement = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  const abonnement = await enregistrement?.pushManager.getSubscription()
  if (!abonnement) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)
  await abonnement.unsubscribe()
}

/**
 * À appeler à chaque ouverture du site.
 *
 * Ne demande jamais d'autorisation — elle se contente de remettre la base en
 * accord avec la réalité. Si le navigateur a changé d'adresse d'envoi depuis
 * la dernière fois, l'ancienne ligne est remplacée ; sinon rien ne bouge.
 */
export async function synchroniser(userId) {
  if (!notificationsPossibles() || Notification.permission !== 'granted' || !userId) return
  try {
    const enregistrement = await enregistrerServiceWorker()
    await navigator.serviceWorker.ready
    let abonnement = await enregistrement.pushManager.getSubscription()

    /*
     * L'abonnement existe, mais a-t-il été créé avec la clé COURANTE ?
     * Si les clés VAPID ont été regénérées depuis, il est devenu inutile :
     * le service de notification refusera tout envoi. On le remplace sans
     * rien demander — l'autorisation, elle, reste acquise.
     */
    if (abonnement && CLE_PUBLIQUE) {
      const cleUtilisee = cleDeLAbonnement(abonnement)
      if (cleUtilisee && cleUtilisee !== CLE_PUBLIQUE) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)
        await abonnement.unsubscribe()
        abonnement = null
      }
    }

    if (!abonnement && CLE_PUBLIQUE) {
      // L'autorisation est toujours là mais l'abonnement a disparu : on le
      // recrée sans rien demander. C'est le cas qui, sans ça, ferait cesser
      // les rappels sans que personne ne s'en aperçoive.
      abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: versOctets(CLE_PUBLIQUE),
      })
    }
    if (abonnement) await enregistrerEnBase(abonnement, userId)
  } catch (e) {
    // Un échec ici ne doit jamais empêcher le site de s'afficher.
    console.warn('Synchronisation des notifications impossible :', e)
  }
}

/** L'abonnement enregistré par ce navigateur, s'il en a un. */
export async function abonnementActuel() {
  if (!notificationsPossibles()) return null
  try {
    const enregistrement = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    return (await enregistrement?.pushManager.getSubscription()) ?? null
  } catch { return null }
}

/**
 * Affiche une notification SANS passer par le serveur.
 *
 * C'est le test qui manquait. « Envoyer un essai » traverse toute la chaîne —
 * fonction serveur, clés, chiffrement, service d'Apple — et quand il échoue,
 * il ne dit pas lequel des cinq maillons a lâché. Celui-ci ne teste que le
 * bout local : autorisation accordée, service worker en place, notification
 * affichée par le système. S'il marche et que l'autre échoue, le problème est
 * forcément côté serveur ; s'il échoue lui aussi, inutile d'aller chercher
 * plus loin.
 */
export async function testerAffichage() {
  if (!notificationsPossibles()) {
    return { ok: false, raison: 'Ce navigateur ne sait pas afficher de notifications.' }
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, raison: "L'autorisation n'a pas été accordée sur cet appareil." }
  }
  try {
    const enregistrement = await enregistrerServiceWorker()
    await navigator.serviceWorker.ready
    await enregistrement.showNotification('Essai d\'affichage', {
      body: 'Si tu lis ceci, le service worker et l\'autorisation fonctionnent.',
      tag: 'resume-du-jour',
      renotify: true,
      icon: `${import.meta.env.BASE_URL}icone-192.png`,
      badge: `${import.meta.env.BASE_URL}icone-192.png`,
      lang: 'fr',
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, raison: e.message }
  }
}

/**
 * Refait l'abonnement de zéro sur cet appareil.
 *
 * C'est le remède universel au « 403 invalid JWT » : il marche même sur les
 * navigateurs qui n'exposent pas la clé d'origine de l'abonnement, donc là
 * où la détection automatique ne peut rien voir.
 */
export async function reabonner(userId) {
  if (!notificationsPossibles()) {
    return { ok: false, raison: 'Ce navigateur ne sait pas afficher de notifications.' }
  }
  if (!cleVapidValide()) {
    return { ok: false, raison: 'La clé publique VAPID manque ou est mal formée dans le site.' }
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, raison: "Accorde d'abord l'autorisation avec le bouton « Activer »." }
  }
  try {
    const enregistrement = await enregistrerServiceWorker()
    await navigator.serviceWorker.ready

    const ancien = await enregistrement.pushManager.getSubscription()
    if (ancien) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', ancien.endpoint)
      await ancien.unsubscribe()
    }

    const neuf = await enregistrement.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: versOctets(CLE_PUBLIQUE),
    })
    const erreur = await enregistrerEnBase(neuf, userId)
    return erreur ? { ok: false, raison: erreur.message } : { ok: true }
  } catch (e) {
    return { ok: false, raison: e.message }
  }
}

/** Le dernier envoi connu, pour que le site puisse dire s'il s'est tu. */
export async function dernierEnvoi() {
  const { data } = await supabase
    .from('envois').select('*')
    .order('envoye_le', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

/** Demande au serveur un envoi d'essai, tout de suite, sur cet appareil. */
export async function envoyerUnEssai() {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) {
    return { ok: false, raison: 'VITE_SUPABASE_URL manque à la compilation du site.' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, raison: 'Session expirée. Reconnecte-toi.' }

  const url = `${base}/functions/v1/envoyer-rappels`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const corps = await r.json().catch(() => ({}))
    return r.ok
      ? { ok: true }
      : { ok: false, raison: corps.detail ?? corps.erreur ?? `Erreur ${r.status}` }
  } catch (e) {
    /*
     * « Failed to fetch » est le message du navigateur quand la requête n'a
     * jamais abouti. Il ne dit PAS pourquoi, et il recouvre trois causes très
     * différentes. Les énumérer ici évite une demi-heure de recherche à
     * l'aveugle — c'est exactement ce qui s'est produit la première fois.
     */
    const reseau = e instanceof TypeError
    return {
      ok: false,
      raison: reseau
        ? `La requête vers ${url} n'a pas abouti. Trois causes possibles, ` +
          'dans l\'ordre : la fonction n\'est pas encore déployée ' +
          '(npx supabase functions deploy envoyer-rappels --no-verify-jwt) ; ' +
          'elle est déployée mais sans les en-têtes CORS, et le navigateur bloque ' +
          'avant d\'envoyer quoi que ce soit ; ou VITE_SUPABASE_URL est erronée.'
        : e.message,
    }
  }
}
