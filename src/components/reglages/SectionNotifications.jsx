import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useProfil } from '../../data/useProfil'
import {
  notificationsPossibles, installeSurEcranAccueil, estAppareilApple,
  etatAutorisation, activerNotifications, desactiverNotifications,
  dernierEnvoi, envoyerUnEssai, abonnementActuel,
  cleVapidValide, CLE_VAPID, cleDeLAbonnement, reabonner,
} from '../../lib/push'
import { formatLong } from '../../lib/dates'
import AideNotifications from './AideNotifications'

const HEURES = Array.from({ length: 24 }, (_, h) => h)

/**
 * Le réglage des notifications, dans les Paramètres.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUI RESTE, ET POURQUOI
 *
 * La chaîne fonctionne : le diagnostic maillon par maillon et l'essai
 * d'affichage local ont servi à la mettre en route, ils n'ont plus lieu
 * d'être ici. Il reste ce qui sert à l'usage courant — activer, choisir
 * l'heure, suspendre — et un bouton d'essai, parce qu'après un
 * changement de téléphone ou de navigateur c'est la seule façon de
 * vérifier que ça arrive vraiment.
 *
 * Le bouton « Réabonner » ne s'affiche plus que s'il sert : quand cet
 * appareil s'est abonné avec une AUTRE clé publique que celle du site.
 * C'est le seul remède au « 403 invalid JWT », et rien d'autre ne le
 * signale — la ligne en base reste parfaitement valide, seul le service
 * de notification refuse. Caché tant que tout va bien, présent le jour
 * où les clés changent.
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

  // null = le navigateur n'expose pas la clé d'origine (Safari, souvent) :
  // on ne peut alors ni confirmer ni infirmer, donc on n'alarme pas.
  const cleDepassee = Boolean(abonnement) && cleAbonnement !== null &&
    cleAbonnement !== CLE_VAPID

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

      {/* Le seul essai qui reste : celui qui traverse vraiment toute la chaîne. */}
      <div className="ligne-reglage">
        <div>
          <strong>Envoyer une notification d'essai</strong>
          <p className="aide">
            Part du serveur et revient sur cet appareil. De quoi vérifier après
            un changement de téléphone ou de navigateur.
          </p>
        </div>
        <button className="bouton-doux" disabled={occupe || !active || !cleOk}
          onClick={() => lancer(envoyerUnEssai,
            'Envoyé. La notification devrait arriver dans quelques secondes.')}>
          Envoyer un essai
        </button>
      </div>

      {/* N'apparaît que le jour où il sert. */}
      {cleDepassee && (
        <div className="ligne-reglage">
          <div>
            <strong>Réabonner cet appareil</strong>
            <p className="aide">
              Cet appareil s'est abonné avec une autre clé que celle du site :
              le service de notification refusera les envois. Un clic refait
              l'abonnement de zéro.
            </p>
          </div>
          <button className="bouton-doux" disabled={occupe || !cleOk}
            onClick={() => lancer(() => reabonner(user.id),
              'Abonnement refait avec la clé actuelle.')}>
            Réabonner
          </button>
        </div>
      )}

      {envoi && (
        <p className="aide">
          Dernier envoi : {formatLong(envoi.envoye_le.slice(0, 10))} ·{' '}
          {envoi.nb_rappels} rappel(s) · {envoi.statut}
          {envoi.detail ? ` — ${envoi.detail}` : ''}
        </p>
      )}

      {message && (
        <p className={message.ton === 'ok' ? 'info' : 'erreur'}>{message.texte}</p>
      )}

      {/* Le mode d'emploi, replié : trois autorisations à donner à trois
          endroits différents, et une condition propre à iOS. */}
      <AideNotifications />
    </section>
  )
}
