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
import { composerResume } from './resume.js'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const CLE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLE_PLANIFICATEUR = Deno.env.get('CLE_PLANIFICATEUR')!
const VAPID_PUBLIQUE = Deno.env.get('VAPID_PUBLIQUE')!
const VAPID_PRIVEE = Deno.env.get('VAPID_PRIVEE')!
const SUJET_VAPID = Deno.env.get('SUJET_VAPID') ?? 'mailto:contact@exemple.fr'
const LIEN_SITE = Deno.env.get('LIEN_SITE') ?? '/'

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
  const r = await fetch(`${URL_SUPABASE}/auth/v1/user`, {
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${jeton}` },
  })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ?? null
}

/**
 * Envoie le résumé à tous les appareils d'une personne, et journalise.
 *
 * Un appareil qui répond 404 ou 410 est supprimé : son abonnement n'existe
 * plus (icône retirée de l'écran d'accueil, navigateur réinstallé). Sans ce
 * ménage, on réessaierait tous les matins jusqu'à la fin des temps.
 */
async function envoyerA(userId: string, titres: string[]) {
  const resume = composerResume(titres, LIEN_SITE)
  if (!resume) return { statut: 'erreur', detail: 'rien à annoncer' }

  const r = await rest(`push_subscriptions?user_id=eq.${userId}&select=*`)
  const abonnements = r.ok ? await r.json() : []

  if (abonnements.length === 0) {
    return { statut: 'aucun_abonnement', detail: null }
  }

  const message = JSON.stringify(resume)
  const echecs: string[] = []
  let reussites = 0

  for (const a of abonnements) {
    try {
      const res = await envoyer(
        { endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth },
        message,
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
        echecs.push(`${a.appareil ?? 'appareil'} : ${res.statut} ${res.detail ?? ''}`.trim())
      }
    } catch (e) {
      echecs.push(`${a.appareil ?? 'appareil'} : ${(e as Error).message}`)
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
  const jetonPorte = requete.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const clePlanificateur = requete.headers.get('x-cle-planificateur') ?? ''

  // ── Mode essai : une personne, tout de suite ──
  if (clePlanificateur !== CLE_PLANIFICATEUR) {
    const userId = jetonPorte ? await utilisateurDuJeton(jetonPorte) : null
    if (!userId) {
      return new Response(JSON.stringify({ erreur: 'non autorisé' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    const resultat = await envoyerA(userId, ['Ceci est un essai — les notifications fonctionnent.'])
    // Un essai ne s'inscrit PAS au journal : sinon il compterait comme
    // l'envoi du jour et bloquerait le vrai résumé du lendemain matin.
    return new Response(JSON.stringify({ essai: true, ...resultat }), {
      status: resultat.statut === 'ok' ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Mode planifié : tout le monde dont c'est l'heure ──
  const r = await rest('rpc/resumes_a_envoyer', { method: 'POST', body: '{}' })
  if (!r.ok) {
    return new Response(JSON.stringify({ erreur: 'sélection impossible', detail: await r.text() }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const aEnvoyer = await r.json()
  const bilan = []
  for (const ligne of aEnvoyer) {
    const resultat = await envoyerA(ligne.user_id, ligne.titres ?? [])
    await journaliser(ligne.user_id, ligne.nb ?? 0, resultat)
    bilan.push({ user_id: ligne.user_id, nb: ligne.nb, statut: resultat.statut })
  }

  return new Response(JSON.stringify({ traites: bilan.length, bilan }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
