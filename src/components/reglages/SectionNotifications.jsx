import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useProfil } from '../../data/useProfil'
import {
  notificationsPossibles, installeSurEcranAccueil, estAppareilApple,
  etatAutorisation, activerNotifications, desactiverNotifications,
  dernierEnvoi, envoyerUnEssai,
} from '../../lib/push'
import { formatLong } from '../../lib/dates'

const HEURES = Array.from({ length: 24 }, (_, h) => h)

/**
 * Le réglage des notifications, dans les Paramètres.
 *
 * Cette section fait une chose inhabituelle : elle affiche la date du dernier
 * envoi réussi. Ce n'est pas de la décoration. Un système de rappels qui
 * tombe en panne ne prévient personne — on continue simplement de ne rien
 * recevoir, en croyant qu'il n'y a rien à recevoir. La seule façon de s'en
 * apercevoir est de pouvoir regarder.
 */
export default function SectionNotifications() {
  const { user } = useAuth()
  const { profil, modifier } = useProfil()

  const [autorisation, setAutorisation] = useState(() => etatAutorisation())
  const [message, setMessage] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [envoi, setEnvoi] = useState(null)

  useEffect(() => { dernierEnvoi().then(setEnvoi) }, [])

  const possible = notificationsPossibles()
  const surApple = estAppareilApple()
  const installee = installeSurEcranAccueil()
  const active = autorisation === 'granted'

  async function activer() {
    setOccupe(true); setMessage(null)
    const r = await activerNotifications(user.id)
    setAutorisation(etatAutorisation())
    setMessage(r.ok ? { ton: 'ok', texte: 'Cet appareil recevra le résumé.' }
                    : { ton: 'erreur', texte: r.raison })
    setOccupe(false)
  }

  async function couper() {
    setOccupe(true); setMessage(null)
    await desactiverNotifications()
    setAutorisation(etatAutorisation())
    setMessage({ ton: 'ok', texte: 'Cet appareil ne recevra plus rien. Les autres continuent.' })
    setOccupe(false)
  }

  async function essayer() {
    setOccupe(true); setMessage(null)
    const r = await envoyerUnEssai()
    setMessage(r.ok
      ? { ton: 'ok', texte: 'Envoyé. La notification devrait arriver dans quelques secondes.' }
      : { ton: 'erreur', texte: r.raison })
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
          rappels en haut du tableau de bord, lui, fonctionne partout.
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
              {autorisation === 'granted' && 'Autorisées.'}
              {autorisation === 'default' && 'Pas encore demandées.'}
              {autorisation === 'denied' &&
                'Refusées. Il faut les réautoriser dans les réglages du navigateur pour ce site.'}
            </p>
          </div>
          {active
            ? <button className="bouton-doux" disabled={occupe} onClick={couper}>Désactiver</button>
            : <button className="bouton-doux" disabled={occupe || autorisation === 'denied'} onClick={activer}>
                Activer
              </button>}
        </div>
      )}

      <div className="ligne-reglage">
        <div>
          <strong>Heure du résumé</strong>
          <p className="aide">
            {profil?.fuseau
              ? `Heure locale — fuseau détecté : ${profil.fuseau}.`
              : 'Heure locale.'}
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

      {/*
        Le journal. C'est la pièce qui rend une panne visible : si la dernière
        ligne date d'il y a trois semaines, le système s'est tu et on le sait.
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
        <button className="bouton-doux" disabled={occupe || !active} onClick={essayer}>
          Envoyer un essai
        </button>
      </div>

      {message && (
        <p className={message.ton === 'ok' ? 'info' : 'erreur'}>{message.texte}</p>
      )}
    </section>
  )
}
