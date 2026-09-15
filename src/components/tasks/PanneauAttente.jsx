import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import {
  DELAIS_RELANCE, DELAI_RELANCE_DEFAUT, jourDeRelance, libelleAttente, etatAttente,
} from '../../lib/delegation'
import { formatLong, formatRelative, today } from '../../lib/dates'

/**
 * « En attente de » — le suivi de délégation, dans le menu d'une tâche.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUE ÇA RÉSOUT
 *
 * Une tâche qu'on a confiée à quelqu'un n'est ni à faire ni faite : elle
 * est en suspens. Aujourd'hui, elle reste dans la liste comme les
 * autres, on la voit tous les jours sans pouvoir la traiter, et on
 * finit par ne plus la voir du tout. Trois semaines plus tard, on
 * découvre que personne n'a bougé.
 *
 * UN SEUL CHAMP OBLIGATOIRE
 *
 * Le nom. La date de départ se remplit toute seule avec aujourd'hui, la
 * relance avec une semaine. Un formulaire de trois champs pour noter
 * « j'attends la compta » ne serait jamais rempli.
 *
 * DU TEXTE LIBRE, ET C'EST VOULU
 *
 * Les gens qu'on attend n'ont pas de compte sur ce site. « La compta »,
 * « Mme Roux », « le client » : ce qui compte est de s'en souvenir, pas
 * de l'authentifier.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function PanneauAttente({ tache }) {
  const { modifier } = useDonnees()

  const enAttente = Boolean(tache.attente_de)
  const [nom, setNom] = useState(tache.attente_de ?? '')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function appliquer(champs) {
    setErreur(null); setOccupe(true)
    const { error } = await modifier(tache.id, champs)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

  function poser() {
    const propre = nom.trim()
    if (!propre) return
    appliquer({
      attente_de: propre,
      // Les deux autres champs ont un défaut qui va dans 95 % des cas :
      // on attend depuis aujourd'hui, on relance dans une semaine.
      attente_depuis: tache.attente_depuis ?? today(),
      relance_apres: tache.relance_apres ?? DELAI_RELANCE_DEFAUT,
    })
  }

  /* La base refuse une attente incomplète : les trois champs partent
     ensemble, jamais l'un sans les autres. */
  const arreter = () => appliquer({
    attente_de: null, attente_depuis: null, relance_apres: null,
  })

  const relance = jourDeRelance(tache)
  const etat = etatAttente(tache, today())

  return (
    <div className="menu-bloc">
      <h4>En attente de</h4>

      {!enAttente ? (
        <>
          <p className="menu-note">
            Cette tâche dépend de quelqu'un d'autre ? Note-le : elle
            apparaîtra dans « En attente », avec le nombre de jours écoulés.
          </p>
          <div className="menu-champ empile">
            <span>Qui</span>
            <div className="champ-et-action">
              <input
                type="text" maxLength={100} value={nom}
                placeholder="La compta, Mme Roux, le client…"
                aria-label="Qui tu attends"
                onChange={(e) => setNom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); poser() } }}
              />
              <button
                type="button" className="bouton-plein"
                disabled={occupe || !nom.trim()}
                onClick={poser}
              >
                Poser
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className={`menu-note${etat === 'depasse' ? ' erreur' : ''}`}>
            En attente de <strong>{tache.attente_de}</strong>,{' '}
            {libelleAttente(tache, today())}.
            {relance
              ? etat === 'depasse'
                ? ` Relance prévue le ${formatLong(relance)} — c'est passé.`
                : ` Relance ${formatRelative(relance)}.`
              : ' Aucune relance prévue.'}
          </p>

          <div className="menu-champ empile">
            <span>Qui</span>
            <div className="champ-et-action">
              <input
                type="text" maxLength={100} value={nom}
                aria-label="Qui tu attends"
                onChange={(e) => setNom(e.target.value)}
                onBlur={() => {
                  const propre = nom.trim()
                  if (!propre) return setNom(tache.attente_de)
                  if (propre !== tache.attente_de) appliquer({ attente_de: propre })
                }}
              />
            </div>
          </div>

          <label className="menu-champ">
            <span>Depuis le</span>
            <input
              type="date" value={tache.attente_depuis ?? ''}
              max={today()}
              onChange={(e) => e.target.value && appliquer({ attente_depuis: e.target.value })}
            />
          </label>

          <span className="menu-etiquette">Relancer au bout de</span>
          <div className="menu-puces">
            {DELAIS_RELANCE.map((d) => (
              <button
                key={d.jours}
                type="button"
                className={`puce${tache.relance_apres === d.jours ? ' posee' : ''}`}
                aria-pressed={tache.relance_apres === d.jours}
                disabled={occupe}
                onClick={() => appliquer({ relance_apres: d.jours })}
              >{d.nom}</button>
            ))}
            <button
              type="button"
              className={`puce${tache.relance_apres == null ? ' posee' : ''}`}
              aria-pressed={tache.relance_apres == null}
              disabled={occupe}
              onClick={() => appliquer({ relance_apres: null })}
            >Jamais</button>
          </div>
          <p className="menu-note">
            La relance est un rappel ordinaire : elle arrive dans le bandeau
            du tableau de bord et dans le résumé du matin.
          </p>

          <button
            type="button" className="bouton-fin danger plein-large"
            disabled={occupe} onClick={arreter}
          >
            Ne plus attendre
          </button>
        </>
      )}

      {erreur && <p className="menu-note erreur">{erreur}</p>}
    </div>
  )
}
