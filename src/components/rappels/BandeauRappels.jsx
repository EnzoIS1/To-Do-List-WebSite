import { useDonnees } from '../../data/DonneesProvider'
import { formatRelative } from '../../lib/dates'
import { detailRappel } from '../../lib/rappels'

/**
 * Les rappels dont le jour est arrivé.
 *
 * Il n'y a pas de notification poussée sur le téléphone : il faudrait un
 * service qui tourne en permanence côté serveur, et l'ajout du site à
 * l'écran d'accueil de l'iPhone. Ce bandeau est la version qui marche
 * partout, tout de suite — il s'affiche à l'ouverture du site, en haut de
 * la journée, et disparaît quand on l'écarte.
 *
 * Un rappel écarté n'est pas supprimé : `seen_at` est renseigné, la ligne
 * reste. C'est ce qui permettra plus tard de savoir lesquels ont servi.
 */
export default function BandeauRappels() {
  const { rappelsEchus, tasks, marquerRappelVu } = useDonnees()

  // Un rappel dont la tâche est cochée — ou effacée par l'archivage — n'a
  // plus rien à annoncer.
  const vivants = rappelsEchus
    .map((r) => ({ rappel: r, tache: tasks.find((t) => t.id === r.task_id) }))
    .filter(({ tache }) => tache && !tache.is_done)

  if (vivants.length === 0) return null

  return (
    <section className="bandeau-rappels" aria-label="Rappels">
      <h2 className="titre-bloc">Rappels · {vivants.length}</h2>
      <ul>
        {vivants.map(({ rappel, tache }) => (
          <li key={rappel.id}>
            <div className="rappel-texte">
              <strong>{tache.title}</strong>
              {/* L'intitulé du rappel, puis ce qu'il annonce : « La veille ·
                  à faire demain ». Sans l'intitulé, deux rappels de la même
                  tâche s'affichaient à l'identique. */}
              <span className="rappel-echeance">
                {detailRappel(rappel, tache)}
                {tache.due_date && ` · à faire ${formatRelative(tache.due_date)}`}
              </span>
            </div>
            <button
              type="button"
              className="bouton-doux"
              onClick={() => marquerRappelVu(rappel.id)}
            >
              Vu
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
