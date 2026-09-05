import { useState } from 'react'

/**
 * Le mode d'emploi des notifications, appareil par appareil.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE TEXTE EXISTE
 *
 * Activer une notification web demande trois autorisations différentes,
 * qui ne se donnent pas au même endroit : celle du site, celle du
 * navigateur, celle du système. Elles ne se demandent pas dans le même
 * ordre selon l'appareil, et sur iPhone il y a en plus une condition qui
 * n'existe nulle part ailleurs — le site doit être installé sur l'écran
 * d'accueil, sinon le bouton « Activer » ne peut rien faire.
 *
 * Rien dans l'interface ne pouvait le deviner à la place de l'utilisateur.
 * D'où ces trois tutoriels, écrits à partir de ce qui a été vérifié : la
 * règle d'Apple est documentée par Apple et reprise par tous les
 * fournisseurs de push (iOS 16.4 minimum, installation obligatoire), et
 * l'icône de réglages de Chrome est passée du cadenas à des curseurs
 * depuis Chrome 117.
 *
 * Ce qui n'est PAS écrit ici : ce que je n'ai pas pu vérifier. Les
 * libellés exacts des menus changent d'une version à l'autre, donc ils
 * sont décrits par ce qu'ils font, pas cités au mot près quand j'ai un
 * doute.
 * ─────────────────────────────────────────────────────────────────────
 */

const CAS = [
  {
    id: 'pc',
    nom: 'Ordinateur',
    intro: "Chrome, Edge ou Firefox, sur Windows comme sur Mac. L'autorisation " +
      'appartient au navigateur : celle donnée dans Chrome ne vaut pas pour Firefox.',
    etapes: [
      'Ouvre le site dans le navigateur que tu utilises tous les jours.',
      'Va dans Paramètres → Notifications, puis clique « Activer ».',
      'Le navigateur demande l’autorisation, en haut de la fenêtre : réponds « Autoriser ».',
      'Vérifie que le système laisse passer : sur Windows, Paramètres → Système → ' +
        'Notifications (le navigateur doit y être autorisé, et l’assistant de ' +
        'concentration désactivé) ; sur Mac, Réglages → Notifications → le navigateur.',
      'Clique « Envoyer un essai ». La notification doit arriver en quelques secondes.',
    ],
    souci: 'Si « Activer » ne demande rien du tout, c’est que l’autorisation a ' +
      'déjà été refusée une fois : le navigateur ne redemande jamais. Clique ' +
      'l’icône à gauche de l’adresse (des curseurs depuis Chrome 117, un cadenas ' +
      'avant), Notifications → Autoriser, puis recharge la page.',
  },
  {
    id: 'android',
    nom: 'Android',
    intro: 'Avec Chrome. Installer le site n’est pas obligatoire, mais c’est ' +
      'plus sûr : l’icône garde ses notifications même quand tu fermes tes onglets.',
    etapes: [
      'Ouvre le site dans Chrome.',
      'Menu ⋮ → « Ajouter à l’écran d’accueil », puis ouvre le site depuis cette icône.',
      'Paramètres → Notifications → « Activer », puis « Autoriser ».',
      'Depuis Android 13, le système demande en plus sa propre autorisation la ' +
        'première fois : accepte-la.',
      'Si rien n’arrive : Réglages Android → Applications → Chrome → Notifications, ' +
        'et vérifie aussi que l’économie de batterie ne met pas Chrome en veille.',
      'Termine par « Envoyer un essai ».',
    ],
    souci: 'Une autorisation refusée ne se redemande pas. Dans Chrome : ⋮ → ' +
      'Paramètres → Paramètres des sites → Notifications, retrouve le site et ' +
      'remets-le sur « Autoriser ».',
  },
  {
    id: 'ios',
    nom: 'iPhone / iPad',
    intro: 'Ici l’installation n’est pas un confort, c’est une CONDITION. Apple ' +
      'n’autorise les notifications web que depuis un site ajouté à l’écran ' +
      'd’accueil, et seulement à partir d’iOS 16.4. Dans un onglet Safari, le ' +
      'bouton « Activer » ne peut rien faire — ce n’est pas un défaut du site.',
    etapes: [
      'Ouvre le site dans Safari (pas dans un autre navigateur, pour cette étape).',
      'Appuie sur Partager (le carré avec la flèche), puis « Sur l’écran d’accueil » → Ajouter.',
      'Ferme Safari, et rouvre le site EN APPUYANT SUR L’ICÔNE. C’est ce qui ' +
        'change tout : le site tourne alors comme une application.',
      'Paramètres → Notifications → « Activer », puis « Autoriser » dans la ' +
        'demande d’iOS.',
      'Réglages iOS → Notifications → l’icône du site : c’est là que tu choisis ' +
        'la bannière, le son et l’écran verrouillé.',
      'Termine par « Envoyer un essai ».',
    ],
    souci: 'Si tu supprimes l’icône de l’écran d’accueil puis la remets, ' +
      'l’abonnement précédent est perdu : il faut refaire « Activer ». Et ' +
      'l’autorisation vaut pour CET appareil seulement — chaque téléphone, ' +
      'tablette ou ordinateur doit être activé une fois.',
  },
]

export default function AideNotifications() {
  const [ouvert, setOuvert] = useState(false)
  const [cas, setCas] = useState('pc')
  const choisi = CAS.find((c) => c.id === cas)

  return (
    <div className="aide-notifs">
      <button
        type="button"
        className="bouton-aide"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
      >
        <span className="bouton-aide-marque" aria-hidden="true">?</span>
        <span className="bouton-aide-texte">
          <strong>Aide — comment activer les notifications</strong>
          <span>Les étapes pour ordinateur, Android et iPhone.</span>
        </span>
        <span className="bouton-aide-fleche" aria-hidden="true">{ouvert ? '▴' : '▾'}</span>
      </button>

      {ouvert && (
        <div className="aide-corps">
          <div className="segments" role="tablist">
            {CAS.map((c) => (
              <button
                key={c.id} role="tab" aria-selected={cas === c.id}
                className={`segment${cas === c.id ? ' actif' : ''}`}
                onClick={() => setCas(c.id)}
              >{c.nom}</button>
            ))}
          </div>

          <p className="aide-intro">{choisi.intro}</p>

          <ol className="aide-etapes">
            {choisi.etapes.map((e, i) => (
              <li key={i}><span className="aide-numero">{i + 1}</span><span>{e}</span></li>
            ))}
          </ol>

          <p className="aide-souci"><strong>Si ça ne marche pas.</strong> {choisi.souci}</p>

          <p className="aide-rappel-final">
            Une fois activé, tu reçois <strong>un seul message par jour</strong>,
            à l’heure choisie plus haut, qui regroupe tous les rappels dus. Jamais
            une notification par tâche.
          </p>
        </div>
      )}
    </div>
  )
}
