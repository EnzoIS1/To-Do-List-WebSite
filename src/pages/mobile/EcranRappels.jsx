import { useMemo } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import LigneRappel from '../../components/rappels/LigneRappel'
import EmptyState from '../../components/ui/EmptyState'
import { grouperRappels } from '../../lib/listeRappels'
import { formatLong, formatRelative } from '../../lib/dates'

/**
 * Les rappels sur téléphone.
 *
 * Ils n'existaient que sur ordinateur : sur téléphone, il fallait
 * remarquer le bandeau en haut de l'écran des tâches, et rien ne montrait
 * la suite de la semaine. Or c'est justement l'appareil qu'on a sur soi.
 *
 * Même contenu que la page du bureau, même composant de ligne — donc
 * jamais deux comportements à maintenir. Une seule colonne, parce qu'il
 * n'y a pas la place pour deux, et les jours à venir repliés dans leur
 * groupe pour que le haut de l'écran reste ce qui presse.
 */
export default function EcranRappels() {
  const { rappels, tasks } = useDonnees()

  const { enRetard, aujourdhui, aVenir, aTraiter, nombreAVenir } = useMemo(
    () => grouperRappels(rappels, tasks),
    [rappels, tasks]
  )

  return (
    <div className="ecran">
      <header className="ecran-tete colonne">
        <div className="ecran-titre">
          <div>
            <h1>Rappels</h1>
            <p className="sous-titre">
              {aTraiter > 0
                ? `${aTraiter} à traiter · ${nombreAVenir} à venir`
                : `Rien à traiter · ${nombreAVenir} à venir`}
            </p>
          </div>
        </div>
      </header>

      <div className="ecran-corps">
        {enRetard.length > 0 && (
          <>
            <h2 className="titre-bloc alerte">En retard · {enRetard.length}</h2>
            <ul className="liste-rappels">
              {enRetard.map(({ rappel, tache }) => (
                <LigneRappel key={rappel.id} rappel={rappel} tache={tache} />
              ))}
            </ul>
          </>
        )}

        <h2 className="titre-bloc">Aujourd'hui · {aujourdhui.length}</h2>
        {aujourdhui.length === 0 ? (
          <EmptyState>Rien à rappeler aujourd'hui.</EmptyState>
        ) : (
          <ul className="liste-rappels">
            {aujourdhui.map(({ rappel, tache }) => (
              <LigneRappel key={rappel.id} rappel={rappel} tache={tache} />
            ))}
          </ul>
        )}

        <h2 className="titre-bloc discret">À venir · {nombreAVenir}</h2>
        {aVenir.length === 0 ? (
          <EmptyState>Rien de prévu pour les jours qui viennent.</EmptyState>
        ) : (
          aVenir.map(({ jour, lignes }) => (
            <div key={jour} className="groupe-jour">
              <h3 className="jour-rappels">
                {formatLong(jour)}
                <em> · {formatRelative(jour)}</em>
              </h3>
              <ul className="liste-rappels">
                {lignes.map(({ rappel, tache }) => (
                  <LigneRappel key={rappel.id} rappel={rappel} tache={tache} compact />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
