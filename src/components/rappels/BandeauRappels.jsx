import { useEffect, useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import { formatRelative } from '../../lib/dates'
import { detailRappel } from '../../lib/rappels'

/**
 * Les rappels dont le jour est arrivé.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI LE BANDEAU SE REPLIE
 *
 * Avec dix rappels, il occupait la totalité de l'écran : le calendrier
 * et les catégories passaient sous la ligne de flottaison, et le tableau
 * de bord ne montrait plus qu'une chose. Un rappel doit rappeler, pas
 * remplacer la page.
 *
 * Trois lignes, donc, et un bouton pour voir le reste. Trois parce que
 * c'est ce qui tient sous le titre sans pousser le contenu : le compteur
 * à côté du titre dit qu'il y en a d'autres, la liste n'a pas à le
 * prouver en les affichant tous.
 *
 * TOUT ÉCARTER DEMANDE DEUX CLICS
 *
 * « Écarter » renseigne `seen_at` : le rappel reste en base mais ne
 * revient plus. Sur un rappel c'est anodin ; sur dix d'un coup, c'est
 * irréversible depuis l'interface — rien ne permet de « dé-voir ». Le
 * bouton demande donc confirmation, et retombe seul après quelques
 * secondes pour ne pas rester armé au milieu de la page.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Combien de rappels restent visibles quand le bandeau est replié. */
const REPLI = 3

export default function BandeauRappels() {
  const { rappelsEchus, tasks, marquerRappelVu, marquerPlusieursVus } = useDonnees()
  const [deplie, setDeplie] = useState(false)
  const [confirme, setConfirme] = useState(false)

  // Le bouton armé retombe seul : un « Confirmer » oublié au milieu de la
  // page est un piège pour le clic suivant.
  useEffect(() => {
    if (!confirme) return
    const t = setTimeout(() => setConfirme(false), 4000)
    return () => clearTimeout(t)
  }, [confirme])

  // Un rappel dont la tâche est cochée — ou effacée par l'archivage — n'a
  // plus rien à annoncer.
  const vivants = rappelsEchus
    .map((r) => ({ rappel: r, tache: tasks.find((t) => t.id === r.task_id) }))
    .filter(({ tache }) => tache && !tache.is_done)

  if (vivants.length === 0) return null

  const caches = Math.max(0, vivants.length - REPLI)
  const visibles = deplie ? vivants : vivants.slice(0, REPLI)

  function toutEcarter() {
    if (!confirme) return setConfirme(true)
    setConfirme(false)
    setDeplie(false)
    marquerPlusieursVus(vivants.map(({ rappel }) => rappel.id))
  }

  return (
    <section className="bandeau-rappels" aria-label="Rappels">
      <div className="bandeau-tete">
        <h2 className="titre-bloc">Rappels · {vivants.length}</h2>
        {vivants.length > 1 && (
          <button
            type="button"
            className={`bouton-fin${confirme ? ' danger' : ''}`}
            onClick={toutEcarter}
          >
            {confirme ? `Confirmer — écarter les ${vivants.length}` : 'Tout écarter'}
          </button>
        )}
      </div>

      <ul>
        {visibles.map(({ rappel, tache }) => (
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

      {caches > 0 && (
        <button
          type="button"
          className="bouton-fin plein-large replier-rappels"
          aria-expanded={deplie}
          onClick={() => setDeplie((v) => !v)}
        >
          {deplie
            ? 'Réduire'
            : `Voir les ${caches} autre${caches > 1 ? 's' : ''}`}
        </button>
      )}
    </section>
  )
}
