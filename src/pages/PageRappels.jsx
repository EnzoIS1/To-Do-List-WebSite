import { useMemo } from 'react'
import { useDonnees } from '../data/DonneesProvider'
import LigneRappel from '../components/rappels/LigneRappel'
import EmptyState from '../components/ui/EmptyState'
import { grouperRappels } from '../lib/listeRappels'
import { formatLong, formatRelative } from '../lib/dates'

/**
 * Tous les rappels, sur une page.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * La première version était une colonne unique : « Aujourd'hui », puis
 * « À venir », l'un sous l'autre. Sur un écran d'ordinateur, ça donnait
 * une bande de texte au milieu du vide, où il fallait faire défiler pour
 * savoir si la semaine était chargée — alors que la place était là.
 *
 * Deux colonnes, donc : à gauche ce qui demande une action MAINTENANT,
 * à droite ce qui arrive. Chacune défile de son côté, ce qui veut dire
 * qu'une longue liste de retard ne pousse plus la semaine hors de l'écran.
 *
 * Et le retard est sorti d'« aujourd'hui ». Ils étaient mélangés : un
 * rappel de la semaine dernière se lisait comme celui du matin.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function PageRappels() {
  const { rappels, tasks } = useDonnees()

  const { enRetard, aujourdhui, aVenir, aTraiter, nombreAVenir } = useMemo(
    () => grouperRappels(rappels, tasks),
    [rappels, tasks]
  )

  return (
    <div className="page-pleine page-rappels">
      <div className="page-tete">
        <div className="rappels-entete">
          <h1>Rappels</h1>
          <div className="rappels-compteurs">
            {enRetard.length > 0 && (
              <span className="jeton alerte">{enRetard.length} en retard</span>
            )}
            <span className="jeton accent">{aujourdhui.length} aujourd'hui</span>
            <span className="jeton">{nombreAVenir} à venir</span>
          </div>
        </div>
        <p className="sous-titre">
          Une tâche datée se rappelle toute seule la veille, une séance de
          révision le jour même. Tout se règle dans le menu « ⋯ » de la tâche.
        </p>
      </div>

      <div className="page-corps deux-colonnes rappels-colonnes">
        {/* ── À gauche : ce qui demande une action maintenant ── */}
        <section className="colonne-rappels">
          <h2 className="titre-bloc">À traiter · {aTraiter}</h2>

          <div className="colonne-defilante">
            {enRetard.length > 0 && (
              <>
                <h3 className="titre-groupe alerte">En retard · {enRetard.length}</h3>
                <ul className="liste-rappels">
                  {enRetard.map(({ rappel, tache }) => (
                    <LigneRappel key={rappel.id} rappel={rappel} tache={tache} />
                  ))}
                </ul>
              </>
            )}

            <h3 className="titre-groupe">Aujourd'hui · {aujourdhui.length}</h3>
            {aujourdhui.length === 0 ? (
              <EmptyState>Rien à rappeler aujourd'hui.</EmptyState>
            ) : (
              <ul className="liste-rappels">
                {aujourdhui.map(({ rappel, tache }) => (
                  <LigneRappel key={rappel.id} rappel={rappel} tache={tache} />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── À droite : la suite, jour par jour ── */}
        <section className="colonne-rappels">
          <h2 className="titre-bloc">À venir · {nombreAVenir}</h2>

          <div className="colonne-defilante">
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
        </section>
      </div>
    </div>
  )
}
