import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonnees } from '../../data/DonneesProvider'
import { FONCTIONNALITES } from '../../lib/fonctionnalites'

/**
 * La configuration des fonctionnalités actives.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ⚠️ CE BLOC EST VOLONTAIREMENT VIDE, ET C'EST ASSUMÉ
 *
 * Enzo a demandé de créer l'onglet et les boutons sans rien mettre
 * dedans, pour qu'on décide ensemble de ce qui mérite d'être réglable.
 * C'est la bonne façon de procéder : inventer des réglages pour remplir
 * un écran donne des options que personne n'ouvre et que tout le monde
 * doit ensuite maintenir.
 *
 * Chaque fonctionnalité active a donc son bloc, qui dit franchement
 * qu'il n'y a rien à régler pour l'instant. Pas de faux curseurs, pas de
 * champs désactivés qui laisseraient croire à une fonctionnalité à
 * venir : quand un réglage existera, il apparaîtra ici.
 *
 * OÙ BRANCHER UN VRAI RÉGLAGE, LE MOMENT VENU
 *
 * Ajouter une entrée dans `REGLAGES` ci-dessous, avec l'identifiant de
 * la fonctionnalité pour clé et un composant pour valeur. Le reste — le
 * repli, le titre, l'ordre — suit tout seul.
 *
 * Deux réglages existent déjà mais vivent ailleurs, et c'est normal :
 * l'heure du résumé appartient aux notifications, le délai d'archivage
 * aux tâches terminées. Ils n'ont pas à être déplacés ici juste pour
 * remplir la section.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Les réglages réellement écrits, par fonctionnalité. Vide pour l'instant. */
const REGLAGES = {}

export default function SectionConfiguration() {
  const { fonctionActive } = useDonnees()
  const [ouvert, setOuvert] = useState(null)

  const actives = FONCTIONNALITES.filter((f) => fonctionActive(f.id))

  return (
    <>
      <p className="aide">
        Le détail de chaque fonctionnalité que tu as gardée. Pour en
        allumer ou en éteindre, c'est sur la page{' '}
        <Link to="/fonctionnalites">Fonctionnalités</Link>.
      </p>

      <ul className="liste-config">
        {actives.map((f) => {
          const Reglage = REGLAGES[f.id]
          const deplie = ouvert === f.id
          return (
            <li key={f.id} className="ligne-config">
              <div className="config-tete">
                <div className="config-texte">
                  <strong>{f.nom}</strong>
                  <p className="aide">{f.resume}</p>
                </div>
                <button
                  type="button"
                  className="bouton-fin"
                  aria-expanded={deplie}
                  onClick={() => setOuvert(deplie ? null : f.id)}
                >
                  {deplie ? 'Fermer' : 'Configurer'}
                </button>
              </div>

              {deplie && (
                <div className="config-corps">
                  {Reglage ? <Reglage /> : (
                    <p className="aide">
                      Rien à régler ici pour l'instant. Dis-moi ce que tu
                      voudrais pouvoir changer sur « {f.nom} » et je
                      l'ajoute à cet endroit.
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
