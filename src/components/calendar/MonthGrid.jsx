import { monthGrid, monthOf, isToday } from '../../lib/dates'

const JOURS = [
  { court: 'L', long: 'Lundi' },
  { court: 'M', long: 'Mardi' },
  { court: 'M', long: 'Mercredi' },
  { court: 'J', long: 'Jeudi' },
  { court: 'V', long: 'Vendredi' },
  { court: 'S', long: 'Samedi' },
  { court: 'D', long: 'Dimanche' },
]

/**
 * Grille mensuelle de six semaines.
 *
 * Chaque case affiche le NOM des tâches du jour, précédé d'un filet à la
 * couleur de leur catégorie — les pastilles ne disaient pas assez : on voyait
 * qu'il se passait quelque chose sans savoir quoi. Au-delà de ce que la case
 * peut tenir, un « +2 autres » complète le compte, et ouvrir la case donne la
 * liste entière.
 *
 * La comparaison des jours est une simple égalité de chaînes 'AAAA-MM-JJ',
 * puisque `due_date` est un `date` en base et non un horodatage.
 *
 * `apercuMax` vaut deux : c'est ce qui tient dans une case à la hauteur par
 * défaut du panneau sans que le texte soit coupé en deux. Au-delà,
 * « +3 autres » reste plus lisible qu'une pile de titres tronqués.
 *
 * `mode` vaut 'noms' sur grand écran et 'barres' sur téléphone. Ce n'est pas
 * un choix esthétique mais une mesure : sur 390 px de large, une case de
 * calendrier fait 44 px et ne peut afficher que cinq caractères — « Sortir
 * les poubelles » devient « Sort… », ce qui n'apprend rien. En mode 'barres',
 * chaque tâche est un filet à la couleur de sa catégorie, et les noms
 * complets se lisent dans l'agenda sous la grille — y compris pour le jour
 * sélectionné, dont la case reste en filets : l'élargir ne lui donnerait
 * pas un pixel de plus en largeur.
 */
export default function MonthGrid({
  mois, taches, jourChoisi, onJourClique, couleurDe, apercuMax = 2, mode = 'noms',
  joursAvecRappel,
}) {
  const jours = monthGrid(mois.year, mois.month)

  const parJour = taches.reduce((acc, t) => {
    if (!t.due_date) return acc
    ;(acc[t.due_date] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="calendrier">
      <div className="entete-jours">
        {JOURS.map((j, i) => (
          <span key={i}>
            <span className="jour-long">{j.long}</span>
            <span className="jour-court">{j.court}</span>
          </span>
        ))}
      </div>

      <div className="grille">
        {jours.map((jour) => {
          const duJour = parJour[jour] ?? []
          const faites = duJour.filter((t) => t.is_done).length
          const choisi = jour === jourChoisi
          const horsMois = monthOf(jour).month !== mois.month
          /*
           * La ligne « +N autres » compte comme une ligne : quand il y a plus
           * de tâches que la case ne peut en montrer, on affiche une tâche de
           * moins pour lui laisser la place. Sans ça, la dernière était coupée
           * en deux au ras du bord.
           */
          const deborde = duJour.length > apercuMax
          const visibles = choisi
            ? duJour
            : duJour.slice(0, deborde ? Math.max(1, apercuMax - 1) : apercuMax)
          const cachees = duJour.length - visibles.length

          const classes = [
            'case',
            horsMois ? 'hors-mois' : '',
            isToday(jour) ? 'aujourdhui' : '',
            choisi ? 'selectionne' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={jour}
              className={classes}
              aria-current={choisi ? 'date' : undefined}
              aria-label={
                `${jour}, ${duJour.length} tâche${duJour.length > 1 ? 's' : ''}` +
                (joursAvecRappel?.has(jour) ? ', rappel' : '')
              }
              onClick={() => onJourClique?.(jour)}
            >
              <span className="tete-case">
                <span className="numero">{Number(jour.slice(8, 10))}</span>
                {/*
                  Une clochette sur les jours qui portent un rappel. Elle est
                  posée à côté du numéro et non dans la liste des tâches : un
                  rappel n'est pas une tâche de plus ce jour-là, c'est une
                  propriété du jour. La mettre dans la liste ferait croire à
                  une sixième chose à faire.
                */}
                {joursAvecRappel?.has(jour) && (
                  <span className="cloche-jour" title="Rappel ce jour-là" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
                      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
                    </svg>
                  </span>
                )}
                {duJour.length > 0 && (
                  <span
                    className={`compteur-jour${faites === duJour.length ? ' tout-fait' : ''}`}
                    title={`${faites} faite${faites > 1 ? 's' : ''} sur ${duJour.length}`}
                  >
                    {faites}/{duJour.length}
                  </span>
                )}
              </span>

              {mode === 'barres' ? (
                <span className="barres-jour">
                  {duJour.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className={`barre-tache${t.is_done ? ' faite' : ''}`}
                      style={couleurDe ? { '--teinte': couleurDe(t) } : undefined}
                      title={t.title}
                    />
                  ))}
                </span>
              ) : (
                <span className="evenements">
                  {visibles.map((t) => (
                    <span
                      key={t.id}
                      className={`evenement${t.is_done ? ' faite' : ''}`}
                      style={couleurDe ? { '--teinte': couleurDe(t) } : undefined}
                      title={t.title}
                    >
                      {t.title}
                    </span>
                  ))}
                  {cachees > 0 && (
                    <span className="reste">
                      +{cachees} autre{cachees > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
