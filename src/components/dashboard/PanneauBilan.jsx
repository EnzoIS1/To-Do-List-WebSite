import { useMemo, useState } from 'react'
import Panneau from './Panneau'
import { useDonnees } from '../../data/DonneesProvider'
import {
  debutDeSemaine, finDeSemaine, bilanDeLaPeriode, bilanEnTexte, compterBilan,
} from '../../lib/bilan'
import { formatLong, addDays, today } from '../../lib/dates'

/**
 * Le bilan de la semaine — ce qui a été terminé.
 *
 * Une semaine en arrière est consultable : le lundi matin, la semaine en
 * cours est vide, et c'est précisément le moment où on prépare le point
 * hebdomadaire de la semaine écoulée. Sans ce bouton, la fonctionnalité
 * serait inutile le seul jour où on en a besoin.
 *
 * Le bouton « Copier » produit du TEXTE BRUT, volontairement : ça doit
 * survivre à un collage dans un mail, dans Teams ou dans un carnet.
 */
export default function PanneauBilan() {
  const { tasks, nomCategorieDe, premierJour, formatBilan } = useDonnees()
  const [reculDeSemaines, setRecul] = useState(0)
  const [copie, setCopie] = useState(false)

  const jourRef = addDays(today(), -7 * reculDeSemaines)
  const debut = debutDeSemaine(jourRef, premierJour)
  const fin = finDeSemaine(jourRef, premierJour)

  const groupes = useMemo(
    () => bilanDeLaPeriode(tasks, debut, fin),
    [tasks, debut, fin]
  )
  const total = compterBilan(groupes)

  async function copier() {
    // Le format choisi décide si la catégorie accompagne le titre.
    const texte = bilanEnTexte(groupes, formatBilan === 'simple' ? () => null : nomCategorieDe)
    try {
      await navigator.clipboard.writeText(texte)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Le presse-papiers peut être refusé (page non sécurisée, permission
      // refusée). On ne fait pas semblant d'avoir réussi.
      setCopie(false)
      window.prompt('Copie manuelle :', texte)
    }
  }

  return (
    <Panneau
      titre="Bilan de la semaine"
      action={<span className="compteur" title="Tâches terminées">{total}</span>}
    >
      <div className="bilan-navigation">
        <button
          type="button" className="bouton-fin"
          onClick={() => setRecul((v) => v + 1)}
        >
          ← Semaine précédente
        </button>
        <span className="bilan-periode">
          {formatLong(debut)} → {formatLong(fin)}
        </span>
        <button
          type="button" className="bouton-fin"
          disabled={reculDeSemaines === 0}
          onClick={() => setRecul((v) => Math.max(0, v - 1))}
        >
          Suivante →
        </button>
      </div>

      {total === 0 ? (
        <p className="etat-vide">
          Rien de terminé sur cette semaine{reculDeSemaines === 0 ? ' pour l\'instant' : ''}.
        </p>
      ) : (
        <>
          <ul className="bilan-jours">
            {groupes.map(({ jour, taches }) => (
              <li key={jour}>
                <h4>{formatLong(jour)}</h4>
                <ul>
                  {taches.map((t) => (
                    <li key={t.id}>
                      <span>{t.title}</span>
                      {nomCategorieDe(t) && <em> · {nomCategorieDe(t)}</em>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <button type="button" className="bouton-plein plein-large" onClick={copier}>
            {copie ? 'Copié' : `Copier les ${total} lignes`}
          </button>
        </>
      )}
    </Panneau>
  )
}
