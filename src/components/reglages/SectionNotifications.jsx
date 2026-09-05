import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useProfil } from '../../data/useProfil'
import {
  notificationsPossibles, installeSurEcranAccueil, estAppareilApple,
  etatAutorisation, activerNotifications, desactiverNotifications,
  dernierEnvoi, envoyerUnEssai, testerAffichage, abonnementActuel,
  cleVapidValide, CLE_VAPID, cleDeLAbonnement, reabonner,
} from '../../lib/push'
import { formatLong } from '../../lib/dates'

const HEURES = Array.from({ length: 24 }, (_, h) => h)

/**
 * Le réglage des notifications, dans les Paramètres.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI IL Y A UN DIAGNOSTIC ET DEUX BOUTONS D'ESSAI
 *
 * La chaîne d'une notification compte cinq maillons : la clé publique
 * compilée dans le site, le site installé sur l'écran d'accueil,
 * l'autorisation du navigateur, l'abonnement enregistré en base, et la
 * fonction serveur qui envoie. Quand rien n'arrive, un seul bouton
 * « Envoyer un essai » ne dit pas lequel a lâché — il dit juste que ça
 * ne marche pas, ce qu'on savait déjà.
 *
 * D'où la liste ci-dessous, qui montre l'état de chaque maillon, et deux
 * essais séparés : « Tester l'affichage » ne sort pas du téléphone,
 * « Envoyer un essai » traverse toute la chaîne. Si le premier marche et
 * pas le second, le problème est côté serveur, et nulle part ailleurs.
 *
 * Ça compte d'autant plus que je ne peux pas tester ce chemin depuis mon
 * environnement : c'est Enzo qui débogue, il lui faut de quoi le faire.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function SectionNotifications() {
  const { user } = useAuth()
  const { profil, modifier } = useProfil()

  const [autorisation, setAutorisation] = useState(() => etatAutorisation())
  const [abonnement, setAbonnement] = useState(null)
  const [message, setMessage] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [envoi, setEnvoi] = useState(null)

  const rafraichir = useCallback(async () => {
    setAutorisation(etatAutorisation())
    setAbonnement(await abonnementActuel())
    setEnvoi(await dernierEnvoi())
  }, [])

  useEffect(() => { rafraichir() }, [rafraichir])

  const possible = notificationsPossibles()
  const surApple = estAppareilApple()
  const installee = installeSurEcranAccueil()
  const active = autorisation === 'granted'
  const cleOk = cleVapidValide()
  const cleAbonnement = cleDeLAbonnement(abonnement)

  /** Les cinq maillons, dans l'ordre où ils doivent être réglés. */
  const controles = [
    {
      nom: 'Navigateur compatible',
      etat: possible,
      aide: possible ? null : 'Ce navigateur ne connaît pas les notifications web.',
    },
    {
      nom: 'Clé publique compilée dans le site',
      etat: cleOk,
      aide: cleOk
        ? `${CLE_VAPID.slice(0, 12)}… (${CLE_VAPID.length} caractères)`
        : CLE_VAPID
          ? `Clé présente mais mal formée : ${CLE_VAPID.length} caractères au lieu de 87.`
          : 'Absente. En local : VITE_VAPID_PUBLIQUE dans .env.local, puis relancer npm run dev. ' +
            'En ligne : la variable GitHub Actions, la ligne dans le workflow, puis un push.',
    },
    // Ce contrôle n'a de sens que sur un appareil Apple : ailleurs, il n'y
    // a rien à installer, et l'afficher ferait croire à un problème.
    ...(surApple ? [{
      nom: "Site ouvert depuis l'écran d'accueil",
      etat: installee,
      aide: installee ? null
        : "Partager → « Sur l'écran d'accueil », puis rouvrir depuis l'icône. Règle d'Apple.",
    }] : []),
    {
      nom: 'Autorisation accordée',
      etat: active,
      aide: autorisation === 'denied'
        ? 'Refusée. À réautoriser dans les réglages du navigateur pour ce site.'
        : autorisation === 'default' ? 'Pas encore demandée — bouton « Activer » ci-dessous.'
        : null,
    },
    {
      nom: 'Appareil enregistré côté serveur',
      etat: Boolean(abonnement),
      aide: abonnement
        ? `Adresse d'envoi : ${new URL(abonnement.endpoint).host}`
        : "Aucun abonnement sur cet appareil. Les quatre points au-dessus doivent d'abord être verts.",
    },
    /*
     * Le maillon qui manquait, et qui explique « 403 invalid JWT ».
     *
     * Un abonnement est lié à VIE à la clé publique utilisée au moment de
     * s'abonner. Regénérer les clés VAPID rend donc muets tous les
     * abonnements déjà créés — sans que rien ne le signale : la ligne en
     * base reste parfaitement valide, seul le service de notification
     * refuse. Cette ligne compare les deux et propose le remède.
     */
    ...(abonnement ? [{
      nom: 'Abonnement créé avec la clé actuelle',
      etat: cleAbonnement === null ? true : cleAbonnement === CLE_VAPID,
      aide: cleAbonnement === null
        ? "Ce navigateur n'expose pas la clé d'origine : impossible de vérifier. " +
          'En cas de « 403 invalid JWT », utilise « Réabonner cet appareil ».'
        : cleAbonnement === CLE_VAPID ? null
          : 'Cet appareil s\'est abonné avec une AUTRE clé publique. Le service de ' +
            'notification refusera tous les envois. Clique « Réabonner cet appareil ».',
    }] : []),
  ]

  const toutVert = controles.every((c) => c.etat)

  async function lancer(action, succes) {
    setOccupe(true); setMessage(null)
    const r = await action()
    await rafraichir()
    setMessage(r?.ok ? { ton: 'ok', texte: succes } : { ton: 'erreur', texte: r?.raison })
    setOccupe(false)
  }

  return (
    <section>
      <h2>Notifications</h2>
      <p className="aide">
        Un seul message par jour, qui regroupe tous les rappels dus. Jamais
        une notification par tâche.
      </p>

      {!possible && (
        <p className="info">
          Ce navigateur ne sait pas afficher de notifications. Le bandeau de
          rappels en haut du tableau de bord, lui, fonctionne partout — et la
          page Rappels aussi.
        </p>
      )}

      {possible && surApple && !installee && (
        <p className="info">
          Sur iPhone et iPad, les notifications n'existent que si le site est
          installé : <strong>Partager → « Sur l'écran d'accueil »</strong>, puis
          rouvre le site depuis cette icône. C'est une règle d'Apple, pas un
          réglage de notre côté.
        </p>
      )}

      {/* ── L'état de chaque maillon ── */}
      <ul className="diagnostic">
        {controles.map((c) => (
          <li key={c.nom} className={c.etat ? 'vert' : 'rouge'}>
            <span className="pastille-etat" aria-hidden="true">{c.etat ? '✓' : '✕'}</span>
            <span>
              <strong>{c.nom}</strong>
              {c.aide && <span className="aide">{c.aide}</span>}
            </span>
          </li>
        ))}
      </ul>

      {possible && (
        <div className="ligne-reglage">
          <div>
            <strong>Notifications sur cet appareil</strong>
            <p className="aide">
              {active ? 'Autorisées.' : 'Il faut accorder l’autorisation une fois.'}
            </p>
          </div>
          {active
            ? <button className="bouton-doux" disabled={occupe}
                onClick={() => lancer(async () => { await desactiverNotifications(); return { ok: true } },
                  'Cet appareil ne recevra plus rien. Les autres continuent.')}>
                Désactiver
              </button>
            : <button className="bouton-doux" disabled={occupe || autorisation === 'denied'}
                onClick={() => lancer(() => activerNotifications(user.id),
                  'Cet appareil recevra le résumé.')}>
                Activer
              </button>}
        </div>
      )}

      <div className="ligne-reglage">
        <div>
          <strong>Heure du résumé</strong>
          <p className="aide">
            {profil?.fuseau ? `Heure locale — fuseau détecté : ${profil.fuseau}.` : 'Heure locale.'}
          </p>
        </div>
        <select
          value={profil?.heure_resume ?? 7}
          onChange={(e) => modifier({ heure_resume: Number(e.target.value) })}
          aria-label="Heure du résumé"
        >
          {HEURES.map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')} h 00</option>
          ))}
        </select>
      </div>

      <div className="ligne-reglage">
        <div>
          <strong>Envoyer le résumé</strong>
          <p className="aide">Coupe l'envoi quotidien sur tous les appareils à la fois.</p>
        </div>
        <button
          className="bouton-doux"
          onClick={() => modifier({ resume_actif: !(profil?.resume_actif ?? true) })}
        >
          {profil?.resume_actif === false ? 'Réactiver' : 'Suspendre'}
        </button>
      </div>

      {/* ── Les deux essais, du plus local au plus complet ── */}
      <div className="ligne-reglage">
        <div>
          <strong>Réabonner cet appareil</strong>
          <p className="aide">
            Refait l'abonnement de zéro. C'est le remède au « 403 invalid JWT » :
            il survient quand les clés VAPID ont changé depuis l'abonnement, et
            aucun autre réglage ne le corrige.
          </p>
        </div>
        <button className="bouton-doux" disabled={occupe || !active || !cleOk}
          onClick={() => lancer(() => reabonner(user.id),
            'Abonnement refait avec la clé actuelle. Relance l\'essai 2.')}>
          Réabonner
        </button>
      </div>

      <div className="ligne-reglage">
        <div>
          <strong>Essai 1 — l'affichage</strong>
          <p className="aide">
            Ne sort pas de l'appareil. Vérifie l'autorisation et le service
            worker, sans toucher au serveur.
          </p>
        </div>
        <button className="bouton-doux" disabled={occupe || !active}
          onClick={() => lancer(testerAffichage, 'Notification affichée localement.')}>
          Tester l'affichage
        </button>
      </div>

      <div className="ligne-reglage">
        <div>
          <strong>Essai 2 — la chaîne complète</strong>
          <p className="aide">
            Passe par la fonction serveur, le chiffrement et le service de
            notification. Si l'essai 1 marche et pas celui-ci, le problème est
            côté serveur.
          </p>
        </div>
        <button className="bouton-doux" disabled={occupe || !toutVert}
          onClick={() => lancer(envoyerUnEssai,
            'Envoyé. La notification devrait arriver dans quelques secondes.')}>
          Envoyer un essai
        </button>
      </div>

      {/*
        Le journal. C'est la pièce qui rend une panne visible : si la dernière
        ligne date de trois semaines, le système s'est tu et on le sait.
      */}
      <div className="ligne-reglage">
        <div>
          <strong>Dernier envoi</strong>
          <p className="aide">
            {envoi
              ? `${formatLong(envoi.envoye_le.slice(0, 10))} · ${envoi.nb_rappels} rappel(s) · ${envoi.statut}` +
                (envoi.detail ? ` — ${envoi.detail}` : '')
              : 'Aucun envoi enregistré pour l’instant.'}
          </p>
        </div>
        <button className="bouton-doux" disabled={occupe} onClick={rafraichir}>
          Rafraîchir
        </button>
      </div>

      {message && (
        <p className={message.ton === 'ok' ? 'info' : 'erreur'}>{message.texte}</p>
      )}
    </section>
  )
}
