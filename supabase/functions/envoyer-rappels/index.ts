/**
 * La fonction qui envoie le résumé du matin.
 *
 * Réveillée toutes les heures par une tâche planifiée (pg_cron). À chaque
 * réveil elle demande à PostgreSQL « qui doit recevoir son résumé
 * maintenant ? » — c'est la fonction SQL resumes_a_envoyer() qui répond, et
 * qui porte toute la logique de fuseau horaire et de dédoublonnage.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AUCUNE DÉPENDANCE, VOLONTAIREMENT
 *
 * Pas de supabase-js, pas de bibliothèque de notification : uniquement
 * `fetch` et les deux fichiers d'à côté. Je ne peux pas exécuter ce code
 * dans l'environnement de Supabase avant de le livrer ; chaque import
 * serait un endroit où ça peut échouer au déploiement sans que personne
 * l'ait vu venir. PostgREST s'interroge très bien en HTTP nu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Deux façons de l'appeler :
 *
 *   1. La tâche planifiée, avec l'en-tête `x-cle-planificateur`.
 *      Traite toutes les personnes dont c'est l'heure.
 *
 *   2. Toi, depuis les Paramètres du site, avec ton jeton de connexion.
 *      Envoie un résumé d'essai à toi seul, tout de suite, sans tenir
 *      compte de l'heure ni du « déjà envoyé aujourd'hui ».
 *
 * À déployer avec --no-verify-jwt : les deux contrôles ci-dessus sont faits
 * ici, explicitement, plutôt que délégués à un réglage invisible.
 */
import { envoyer } from './webpush.js'
import { composerMessages } from './resume.js'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const CLE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLE_PLANIFICATEUR = Deno.env.get('CLE_PLANIFICATEUR')!
const VAPID_PUBLIQUE = Deno.env.get('VAPID_PUBLIQUE')!
const VAPID_PRIVEE = Deno.env.get('VAPID_PRIVEE')!
const SUJET_VAPID = Deno.env.get('SUJET_VAPID') ?? 'mailto:contact@exemple.fr'
const LIEN_SITE = Deno.env.get('LIEN_SITE') ?? '/'

/*
 * ─────────────────────────────────────────────────────────────────────────
 * CORS — sans ça, le bouton « Envoyer un essai » ne part JAMAIS.
 *
 * La requête d'essai est envoyée depuis le site, donc depuis une autre
 * origine que celle de la fonction. Et elle porte un en-tête Authorization,
 * qui n'est pas un en-tête « simple » : le navigateur envoie d'abord une
 * requête OPTIONS de contrôle préalable et attend une réponse qui autorise
 * explicitement l'origine, la méthode et l'en-tête.
 *
 * Sans ces en-têtes, le navigateur bloque avant même d'avoir envoyé quoi
 * que ce soit et signale « Failed to fetch » — un message qui ne dit ni
 * qu'il s'agit de CORS, ni quelle requête a échoué. C'est exactement ce qui
 * s'est produit, et ça m'avait échappé parce que je ne peux pas exécuter
 * cette fonction depuis un navigateur avant de la livrer.
 *
 * Rejoué depuis : essai-cors.mjs lance la fonction dans Deno et vérifie le
 * contrôle préalable.
 * ─────────────────────────────────────────────────────────────────────────
 */
const CORS = {
  // Le site est public et la fonction ne fait rien sans jeton valide :
  // restreindre l'origine n'ajouterait aucune sécurité, et casserait
  // l'essai depuis localhost pendant le développement.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-cle-planificateur, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

/** Toute réponse de cette fonction passe par ici : aucune ne peut oublier CORS. */
const repondre = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

/**
 * Les réglages obligatoires, contrôlés avant tout envoi.
 *
 * Un secret oublié se manifestait par une erreur de cryptographie remontée
 * telle quelle au site — « Cannot read properties of undefined » — qui ne
 * disait ni quel secret, ni où le mettre. Le contrôle ci-dessous transforme
 * ça en une phrase actionnable, et vérifie aussi la FORME : les deux clés
 * VAPID ont des longueurs différentes (87 et 43), donc les intervertir est
 * détectable, et c'est l'erreur de recopie la plus facile à commettre.
 *
 * On ne renvoie jamais la valeur d'un secret, seulement son état.
 */
function configurationManquante(): string[] {
  const soucis: string[] = []
  const exiger = (nom: string, valeur: string | undefined, forme?: RegExp, attendu?: string) => {
    if (!valeur) soucis.push(`${nom} : absent des secrets de la fonction`)
    else if (forme && !forme.test(valeur)) soucis.push(`${nom} : ${attendu} (reçu ${valeur.length} caractères)`)
  }
  exiger('SUPABASE_URL', URL_SUPABASE)
  exiger('SUPABASE_SERVICE_ROLE_KEY', CLE_SERVICE)
  exiger('VAPID_PUBLIQUE', VAPID_PUBLIQUE, /^B[A-Za-z0-9_-]{85,87}$/,
    'doit faire 87 caractères et commencer par « B » — as-tu collé la clé privée ici ?')
  exiger('VAPID_PRIVEE', VAPID_PRIVEE, /^[A-Za-z0-9_-]{42,44}$/,
    'doit faire 43 caractères — as-tu collé la clé publique ici ?')
  exiger('SUJET_VAPID', SUJET_VAPID, /^mailto:.+@.+/,
    'doit être « mailto: » suivi d\'une adresse e-mail')
  /*
   * CLE_PLANIFICATEUR est maintenant OBLIGATOIRE, et c'est un correctif
   * de sécurité, pas un confort.
   *
   * L'accès « planificateur » se décidait par `cleRecue !== CLE_PLANIFICATEUR`.
   * Si le secret n'était pas renseigné — ou renseigné vide — la comparaison
   * devenait « '' !== '' », donc fausse : n'importe qui envoyant un en-tête
   * vide passait pour la tâche planifiée et déclenchait l'envoi du résumé
   * de TOUS les comptes, sans aucun jeton. Rien ne le signalait, puisque
   * ce secret n'était pas contrôlé au démarrage.
   *
   * Il est donc exigé, et long : 24 caractères au minimum.
   */
  exiger('CLE_PLANIFICATEUR', CLE_PLANIFICATEUR, /^.{24,}$/,
    'doit faire au moins 24 caractères — c\'est le seul secret qui autorise ' +
    'l\'envoi à tous les comptes')
  return soucis
}

/**
 * Comparaison à temps constant.
 *
 * `a !== b` s'arrête au premier caractère différent : le temps de réponse
 * dépend donc du nombre de caractères devinés, ce qui permet en théorie de
 * retrouver un secret caractère par caractère. Sur un réseau public la
 * mesure est difficile, mais la parade tient en cinq lignes — autant ne
 * pas laisser la question ouverte.
 */
function memeSecret(recu: string, attendu: string): boolean {
  if (typeof attendu !== 'string' || attendu.length < 24) return false
  if (recu.length !== attendu.length) return false
  let difference = 0
  for (let i = 0; i < attendu.length; i++) {
    difference |= recu.charCodeAt(i) ^ attendu.charCodeAt(i)
  }
  return difference === 0
}

/**
 * L'adresse d'un appareil doit être un vrai service de notification.
 *
 * La fonction poste sur cette adresse depuis l'intérieur du réseau de
 * Supabase, avec la clé de service. Une adresse interne enregistrée comme
 * « appareil » (169.254.169.254, le service de métadonnées des machines
 * cloud) en ferait un relais d'attaque — c'est le schéma classique d'une
 * SSRF. La base le refuse depuis la migration 0010 ; ce contrôle-ci est la
 * seconde ceinture, pour les lignes plus anciennes et pour le jour où la
 * fonction lira ses adresses ailleurs.
 */
const SERVICES_DE_PUSH = /^https:\/\/[A-Za-z0-9.-]+\.(googleapis\.com|apple\.com|mozilla\.com|windows\.com)\//

const enteteService = {
  apikey: CLE_SERVICE,
  Authorization: `Bearer ${CLE_SERVICE}`,
  'Content-Type': 'application/json',
}

const rest = (chemin: string, options: RequestInit = {}) =>
  fetch(`${URL_SUPABASE}/rest/v1/${chemin}`, {
    ...options,
    headers: { ...enteteService, ...(options.headers ?? {}) },
  })

/** Vérifie un jeton d'utilisateur auprès de Supabase et renvoie son id. */
async function utilisateurDuJeton(jeton: string): Promise<string | null> {
  // Un échec réseau ici ne doit pas devenir une erreur 500 sans corps : le
  // site n'aurait rien de lisible à afficher.
  try {
    const r = await fetch(`${URL_SUPABASE}/auth/v1/user`, {
      headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${jeton}` },
    })
    if (!r.ok) return null
    const u = await r.json()
    return u?.id ?? null
  } catch {
    return null
  }
}

/**
 * Envoie le résumé à tous les appareils d'une personne, et journalise.
 *
 * Un appareil qui répond 404 ou 410 est supprimé : son abonnement n'existe
 * plus (icône retirée de l'écran d'accueil, navigateur réinstallé). Sans ce
 * ménage, on réessaierait tous les matins jusqu'à la fin des temps.
 */
async function envoyerA(userId: string, titres: string[], mode = 'resume') {
  // Un message en mode groupé, autant que de tâches en mode « une par
  // tâche ». Le reste de la fonction ne change pas : elle envoie une liste.
  const messages = composerMessages(titres, LIEN_SITE, mode)
  if (messages.length === 0) return { statut: 'erreur', detail: 'rien à annoncer' }

  const r = await rest(`push_subscriptions?user_id=eq.${userId}&select=*`)
  const toutes = r.ok ? await r.json() : []
  // On n'appelle QUE des services de notification connus (voir plus haut).
  const abonnements = toutes.filter((a: { endpoint?: string }) =>
    typeof a.endpoint === 'string' && SERVICES_DE_PUSH.test(a.endpoint))

  if (abonnements.length === 0) {
    return { statut: 'aucun_abonnement', detail: null }
  }

  const echecs: string[] = []
  let reussites = 0

  for (const a of abonnements) {
   for (const contenu of messages) {
    try {
      const res = await envoyer(
        { endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth },
        JSON.stringify(contenu),
        { publique: VAPID_PUBLIQUE, privee: VAPID_PRIVEE },
        SUJET_VAPID,
      )
      if (res.ok) {
        reussites++
        await rest(`push_subscriptions?id=eq.${a.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ dernier_ok: new Date().toISOString(), echecs: 0 }),
        })
      } else if (res.mort) {
        await rest(`push_subscriptions?id=eq.${a.id}`, { method: 'DELETE' })
        echecs.push(`${a.appareil ?? 'appareil'} : abonnement expiré, supprimé`)
      } else {
        await rest(`push_subscriptions?id=eq.${a.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ echecs: (a.echecs ?? 0) + 1 }),
        })
        /*
         * Un 403 n'est presque jamais un problème de configuration de la
         * fonction : c'est le service de notification qui constate que la
         * clé signant l'envoi n'est pas celle avec laquelle l'appareil s'est
         * abonné. Aucun réglage côté serveur ne le corrige — il faut
         * refaire l'abonnement sur l'appareil concerné.
         */
        const explication = res.statut === 403
          ? "clé VAPID refusée : cet appareil s'est abonné avec une autre clé publique. " +
            'Sur cet appareil, Paramètres → Notifications → « Réabonner ».'
          : `${res.statut} ${res.detail ?? ''}`.trim()
        echecs.push(`${a.appareil ?? 'appareil'} : ${explication}`)
      }
    } catch (e) {
      echecs.push(`${a.appareil ?? 'appareil'} : ${(e as Error).message}`)
    }
   }
  }

  return reussites > 0
    ? { statut: 'ok', detail: echecs.length ? echecs.join(' | ') : null }
    : { statut: 'erreur', detail: echecs.join(' | ') || 'aucun envoi accepté' }
}

const journaliser = (userId: string, nb: number, r: { statut: string; detail: string | null }) =>
  rest('envois', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, nb_rappels: nb, statut: r.statut, detail: r.detail }),
  })

Deno.serve(async (requete) => {
  // Le contrôle préalable du navigateur. Il doit répondre AVANT tout le
  // reste : il n'est ni authentifié ni censé faire quoi que ce soit.
  if (requete.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  // Rien ne peut fonctionner si un secret manque : autant le dire tout de
  // suite, et le dire précisément, plutôt que d'échouer plus loin dans le
  // chiffrement avec un message que personne ne peut relier à un réglage.
  const soucis = configurationManquante()
  if (soucis.length > 0) {
    return repondre({
      erreur: 'configuration incomplète',
      detail: `Dans Supabase → Edge Functions → Secrets : ${soucis.join(' ; ')}.`,
      manquants: soucis,
    }, 500)
  }

  const jetonPorte = requete.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const clePlanificateur = requete.headers.get('x-cle-planificateur') ?? ''

  // ── Mode essai : une personne, tout de suite ──
  // `memeSecret` refuse un secret absent, trop court, ou de longueur
  // différente : un en-tête vide ne peut plus ouvrir le mode planificateur.
  if (!memeSecret(clePlanificateur, CLE_PLANIFICATEUR)) {
    const userId = jetonPorte ? await utilisateurDuJeton(jetonPorte) : null
    if (!userId) {
      return repondre({
        erreur: 'non autorisé',
        detail: 'Session expirée, ou la fonction ne joint pas Supabase. ' +
          'Reconnecte-toi ; si ça persiste, vérifie les secrets de la fonction.',
      }, 401)
    }
    const resultat = await envoyerA(userId, ['Ceci est un essai — les notifications fonctionnent.'])
    // Un essai ne s'inscrit PAS au journal : sinon il compterait comme
    // l'envoi du jour et bloquerait le vrai résumé du lendemain matin.
    return repondre({ essai: true, ...resultat }, resultat.statut === 'ok' ? 200 : 502)
  }

  // ── Mode planifié : tout le monde dont c'est l'heure ──
  const r = await rest('rpc/resumes_a_envoyer', { method: 'POST', body: '{}' })
  if (!r.ok) {
    return repondre({ erreur: 'sélection impossible', detail: await r.text() }, 500)
  }

  const aEnvoyer = await r.json()
  const bilan = []
  for (const ligne of aEnvoyer) {
    // `mode` vient du profil, via la fonction SQL (migration 0009).
    const resultat = await envoyerA(ligne.user_id, ligne.titres ?? [], ligne.mode ?? 'resume')
    await journaliser(ligne.user_id, ligne.nb ?? 0, resultat)
    bilan.push({ user_id: ligne.user_id, nb: ligne.nb, statut: resultat.statut })
  }

  return repondre({ traites: bilan.length, bilan })
})
