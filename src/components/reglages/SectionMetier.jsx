import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import { METIERS, MODULES, moduleActif, nomDuMetier } from '../../lib/metiers'

/**
 * « Ce que tu fais » — le métier, puis les modules.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DEUX RÉGLAGES, ET L'UN N'ENFERME PAS L'AUTRE
 *
 * Le métier propose, les modules disposent. Choisir « Étudiant » allume
 * le mode révision ; un salarié qui prépare une certification peut
 * l'allumer aussi, sans mentir sur son métier. C'est le désaccord que
 * j'ai assumé avec la demande d'origine : le métier prédit mal les
 * besoins, il fait un bon point de départ et un mauvais verrou.
 *
 * POURQUOI CHANGER DE MÉTIER DEMANDE CONFIRMATION
 *
 * Parce que ça REMET LES MODULES AUX VALEURS CONSEILLÉES. Quelqu'un qui
 * a pris le temps d'en régler quatre à la main ne doit pas les perdre
 * parce qu'il a cliqué sur une carte pour voir ce qu'elle faisait. Le
 * bouton annonce donc ce qu'il va écraser, et la confirmation retombe
 * seule.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function SectionMetier() {
  const { metier, modules, choisirMetier, basculerModule } = useDonnees()
  const [aConfirmer, setAConfirmer] = useState(null)

  function cliquer(id) {
    // Premier métier choisi : rien à écraser, on applique directement.
    if (!metier) return choisirMetier(id)
    if (id === metier) return
    if (aConfirmer !== id) return setAConfirmer(id)
    setAConfirmer(null)
    choisirMetier(id)
  }

  return (
    <section>
      <h2>Ce que tu fais</h2>
      <p className="aide">
        Le métier choisi allume les fonctionnalités qui servent le plus
        souvent dans ce contexte. Ce n'est qu'un point de départ : tout
        reste réglable une par une juste en dessous.
      </p>

      <div className="choix-ambiance" role="radiogroup" aria-label="Métier">
        {METIERS.map((m) => {
          const actif = metier === m.id
          const arme = aConfirmer === m.id
          return (
            <button
              key={m.id}
              type="button" role="radio" aria-checked={actif}
              className={`carte-theme${actif ? ' actif' : ''}`}
              onClick={() => cliquer(m.id)}
            >
              <span className="carte-theme-nom">{m.nom}</span>
              <span className="carte-theme-aide">
                {arme ? 'Confirmer — les modules repassent aux valeurs conseillées' : m.aide}
              </span>
            </button>
          )
        })}
      </div>

      {!metier && (
        <p className="aide">
          Aucun métier choisi pour l'instant : tout est allumé.
        </p>
      )}

      <h3 className="sous-titre-reglage">Fonctionnalités</h3>
      <p className="aide">
        Éteindre une fonctionnalité la fait disparaître de l'interface.
        Rien n'est supprimé : tout revient tel quel en la rallumant.
      </p>

      <ul className="liste-modules">
        {MODULES.map((m) => {
          const allume = moduleActif(modules, m.id)
          return (
            <li key={m.id} className="ligne-reglage">
              <div>
                <strong>{m.nom}</strong>
                <p className="aide">{m.aide}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allume}
                className={`interrupteur${allume ? ' allume' : ''}`}
                onClick={() => basculerModule(m.id, !allume)}
              >
                <span className="interrupteur-piste"><span className="interrupteur-bouton" /></span>
                <span className="interrupteur-texte">
                  <strong>{allume ? 'Allumé' : 'Éteint'}</strong>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {metier && (
        <p className="aide">
          Réglages conseillés pour « {nomDuMetier(metier)} » —{' '}
          <button
            type="button" className="bouton-fin"
            onClick={() => choisirMetier(metier)}
          >
            tout remettre par défaut
          </button>
        </p>
      )}
    </section>
  )
}
