import { useMemo } from 'react'
import { useDonnees } from '../data/DonneesProvider'
import TaskList from '../components/tasks/TaskList'
import EmptyState from '../components/ui/EmptyState'
import { formatLong, formatRelative, isPast, isToday, today } from '../lib/dates'

/**
 * Tous les rappels, sur une page.
 *
 * Le bandeau du tableau de bord ne montre que ce qui est échu aujourd'hui —
 * c'est ce qu'on veut le matin, mais ça ne dit rien de la semaine. Ici on
 * voit aussi ce qui arrive, groupé par jour, ce qui permet de repérer un
 * mercredi chargé avant de s'y trouver.
 *
 * Un rappel dont la tâche est cochée n'apparaît pas : il n'a plus rien à
 * annoncer, et le laisser donnerait une liste qui ne se vide jamais.
 */
export default function PageRappels() {
  const {
    rappels, tasks, loading, cocher, modifier, marquerRappelVu, supprimerRappel,
  } = useDonnees()

  const { echus, aVenir } = useMemo(() => {
    const jour = today()
    const vivants = rappels
      .filter((r) => !r.seen_at)
      .map((r) => ({ rappel: r, tache: tasks.find((t) => t.id === r.task_id) }))
      .filter(({ tache }) => tache && !tache.is_done)

    const echus = vivants
      .filter(({ rappel }) => rappel.remind_on <= jour)
      .sort((a, b) => a.rappel.remind_on.localeCompare(b.rappel.remind_on))

    // Groupés par jour : « jeudi 10 septembre » puis ses tâches, comme un
    // agenda. Une liste plate de trente lignes ne se lit pas.
    const parJour = new Map()
    for (const v of vivants) {
      if (v.rappel.remind_on <= jour) continue
      if (!parJour.has(v.rappel.remind_on)) parJour.set(v.rappel.remind_on, [])
      parJour.get(v.rappel.remind_on).push(v)
    }

    return {
      echus,
      aVenir: [...parJour.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    }
  }, [rappels, tasks])

  return (
    <div className="page-pleine page-rappels">
      <div className="page-tete">
        <h1>Rappels</h1>
        <p className="sous-titre">
          Ce qui est arrivé à échéance, et ce qui vient. Une tâche datée se
          rappelle toute seule la veille ; une séance de révision, le jour même.
        </p>
      </div>

      <div className="page-corps colonne-unique">
        <section className="bloc-rappels">
          <h2 className="titre-bloc alerte">Aujourd'hui · {echus.length}</h2>
          {echus.length === 0 ? (
            <EmptyState>Rien à rappeler pour l'instant.</EmptyState>
          ) : (
            <ul className="liste-rappels">
              {echus.map(({ rappel, tache }) => (
                <li key={rappel.id} className={isPast(rappel.remind_on) && !isToday(rappel.remind_on) ? 'en-retard' : ''}>
                  <div className="rappel-texte">
                    <strong>{tache.title}</strong>
                    <span className="rappel-echeance">
                      Rappel du {formatLong(rappel.remind_on)}
                      {tache.due_date && ` · à faire ${formatRelative(tache.due_date)}`}
                      {rappel.auto && ' · automatique'}
                    </span>
                  </div>
                  <div className="rappel-actions">
                    <button
                      type="button" className="bouton-doux"
                      onClick={() => cocher(tache)}
                    >
                      Fait
                    </button>
                    <button
                      type="button" className="lien"
                      onClick={() => marquerRappelVu(rappel.id)}
                    >
                      Écarter
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bloc-rappels">
          <h2 className="titre-bloc">À venir</h2>
          {aVenir.length === 0 ? (
            <EmptyState>Rien de prévu pour les jours qui viennent.</EmptyState>
          ) : (
            aVenir.map(([jour, lignes]) => (
              <div key={jour} className="groupe-jour">
                <h3 className="jour-rappels">
                  {formatLong(jour)}
                  <em> · {formatRelative(jour)}</em>
                </h3>
                <TaskList
                  taches={lignes.map((l) => l.tache)}
                  loading={loading}
                  onCocher={cocher}
                  onDater={modifier}
                  vide=""
                />
                <button
                  type="button" className="lien"
                  onClick={() => lignes.forEach((l) => supprimerRappel(l.rappel.id))}
                >
                  Retirer {lignes.length > 1 ? 'ces rappels' : 'ce rappel'}
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
