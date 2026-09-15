import { useMemo } from 'react'
import Panneau from './Panneau'
import { useDonnees } from '../../data/DonneesProvider'
import {
  grouperParPersonne, compterAttentes, libelleAttente, etatAttente, jourDeRelance,
} from '../../lib/delegation'
import { formatRelative, today } from '../../lib/dates'

/**
 * « En attente » — qui bloque quoi, et depuis combien de temps.
 *
 * ─────────────────────────────────────────────────────────────────────
 * L'ORDRE EST LA FONCTIONNALITÉ
 *
 * Une liste d'attentes classée par date de création ne sert à rien. Ce
 * qu'on veut savoir en ouvrant ce panneau, c'est : QU'EST-CE QUI TRAÎNE
 * LE PLUS ? Les personnes sont donc classées par leur attente la plus
 * ancienne, et à l'intérieur, de la plus ancienne à la plus récente.
 * La ligne du haut est toujours celle qui mérite un coup de fil.
 *
 * DEUX ACTIONS, ET PAS UNE DE PLUS
 *
 * « Reçu » coche la tâche : ce qu'on attendait est arrivé. « Relancé »
 * remet le compteur à aujourd'hui — c'est ce qu'on fait après avoir
 * envoyé le mail de relance, et ça repousse mécaniquement la prochaine.
 * Tout le reste se règle dans le menu « ⋯ » de la tâche.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function PanneauAttentes() {
  const { tasks, cocher, modifier, couleurDe } = useDonnees()
  const jour = today()

  const groupes = useMemo(() => grouperParPersonne(tasks, jour), [tasks, jour])
  const total = compterAttentes(groupes)
  const aRelancer = groupes.filter((g) => g.aRelancer).length

  return (
    <Panneau
      titre="En attente"
      action={(
        <span
          className={`compteur${aRelancer > 0 ? ' alerte' : ''}`}
          title={aRelancer > 0 ? `${aRelancer} personne(s) à relancer` : 'Tâches en attente'}
        >
          {total}
        </span>
      )}
    >
      {total === 0 ? (
        <p className="etat-vide">
          Rien en attente. Depuis le menu « ⋯ » d'une tâche, tu peux noter
          que tu attends quelqu'un.
        </p>
      ) : (
        <ul className="liste-attentes">
          {groupes.map((g) => (
            <li key={g.personne}>
              <h4 className={g.aRelancer ? 'a-relancer' : undefined}>
                {g.personne}
                <span>{g.taches.length}</span>
              </h4>

              <ul>
                {g.taches.map((t) => {
                  const etat = etatAttente(t, jour)
                  const relance = jourDeRelance(t)
                  return (
                    <li key={t.id} className={`attente ${etat}`} style={{ '--teinte': couleurDe(t) }}>
                      <span className="attente-pastille" aria-hidden="true" />
                      <div className="attente-texte">
                        <strong>{t.title}</strong>
                        <span>
                          {libelleAttente(t, jour)}
                          {relance && (etat === 'depasse'
                            ? ' · à relancer'
                            : etat === 'a-relancer'
                              ? " · à relancer aujourd'hui"
                              : ` · relance ${formatRelative(relance)}`)}
                        </span>
                      </div>
                      <div className="attente-actions">
                        <button
                          type="button" className="bouton-plein"
                          title="Ce que j'attendais est arrivé"
                          onClick={() => cocher(t)}
                        >
                          Reçu
                        </button>
                        <button
                          type="button" className="bouton-fin"
                          title="Je viens de relancer : le compteur repart d'aujourd'hui"
                          onClick={() => modifier(t.id, { attente_depuis: jour })}
                        >
                          Relancé
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Panneau>
  )
}
