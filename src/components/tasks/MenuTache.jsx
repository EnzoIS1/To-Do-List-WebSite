import { useState } from 'react'
import MenuFlottant from '../ui/MenuFlottant'
import {
  useDonnees, DECALAGES_RAPPEL, jourDuRappel,
} from '../../data/DonneesProvider'
import { datesDeRevision } from '../../lib/revision'
import { formatLong, formatRelative, isPast, today } from '../../lib/dates'

/**
 * Tout ce qu'on peut faire à une tâche, en un seul endroit.
 *
 * Avant, la catégorie se changeait par une liste déroulante posée dans la
 * ligne — et seulement dans la prise de note, jamais ailleurs, jamais sur
 * une tâche déjà cochée. Trois réglages alignés dans une ligne de 48 px de
 * haut sur un téléphone, c'était aussi la raison pour laquelle le titre
 * n'avait plus la place de s'afficher en entier.
 *
 * Un seul bouton « ⋯ » les rassemble donc ici. La ligne redevient lisible,
 * et tous les réglages restent accessibles quel que soit l'écran et quel
 * que soit l'état de la tâche.
 */
export default function MenuTache({ tache, ancre, onFermer }) {
  const {
    choixCategories, modifier, supprimer,
    rappelsDe, creerRappel, supprimerRappel,
    revisionsDe, activerRevision, desactiverRevision, tasks,
  } = useDonnees()

  const [erreur, setErreur] = useState(null)
  const [occupe, setOccupe] = useState(false)

  const mesRappels = rappelsDe(tache.id)
  const mesRevisions = revisionsDe(tache.id)
  const source = tache.revision_of ? tasks.find((t) => t.id === tache.revision_of) : null

  /** Un seul geste : on allume, ou on éteint. */
  async function basculerRevision() {
    setErreur(null); setOccupe(true)
    const { error } = mesRevisions.length
      ? await desactiverRevision(tache)
      : await activerRevision(tache)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

  // Combien de séances l'interrupteur créerait, si on l'allumait maintenant.
  const seancesPrevues = tache.due_date ? datesDeRevision(today(), tache.due_date).length : 0
  const revisionPossible = seancesPrevues > 0

  return (
    <MenuFlottant ancre={ancre} titre={tache.title} onFermer={onFermer}>
      <div className="menu-corps">

        {source && (
          <p className="menu-note">
            Séance de révision de « {source.title} ».
            {source.exam_date && ` Examen le ${formatLong(source.exam_date)}.`}
          </p>
        )}

        {/* ── Catégorie : disponible partout, même sur une tâche cochée ── */}
        <label className="menu-champ">
          <span>Catégorie</span>
          <select
            value={tache.category_id ?? ''}
            onChange={(e) => modifier(tache.id, { category_id: e.target.value || null })}
          >
            <option value="">Sans catégorie</option>
            {choixCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.chemin ?? c.name}</option>
            ))}
          </select>
        </label>

        <label className="menu-champ">
          <span>Échéance</span>
          <input
            type="date"
            value={tache.due_date ?? ''}
            onChange={(e) => modifier(tache.id, { due_date: e.target.value || null })}
          />
        </label>

        {/* ── Rappels ── */}
        <div className="menu-bloc">
          <h4>Rappel</h4>

          <p className="menu-note">
            {tache.revision_of
              ? 'Une séance de révision se rappelle le jour même, automatiquement.'
              : 'Une tâche datée se rappelle la veille, automatiquement. Ajoute ici un rappel plus tôt si tu veux t\'y prendre à l\'avance.'}
          </p>

          {tache.due_date && DECALAGES_RAPPEL.every((d) => isPast(jourDuRappel(tache.due_date, d.jours))) && (
            <p className="menu-note">
              L'échéance est trop proche pour un rappel « avant » : choisis un
              jour précis ci-dessous.
            </p>
          )}

          {tache.due_date ? (
            <div className="menu-puces">
              {DECALAGES_RAPPEL.map((d) => {
                const jour = jourDuRappel(tache.due_date, d.jours)
                const depasse = isPast(jour)
                /*
                 * Un décalage déjà couvert est marqué comme tel plutôt que
                 * cliquable pour rien. Le cas arrive tout le temps depuis que
                 * le rappel de la veille est automatique : « La veille »
                 * n'avait plus aucun effet visible, ce qui donnait
                 * l'impression que le bouton était cassé.
                 */
                const dejaPose = mesRappels.some((r) => r.remind_on === jour)
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`puce${dejaPose ? ' posee' : ''}`}
                    disabled={depasse || dejaPose}
                    title={
                      dejaPose ? `Rappel déjà posé le ${formatLong(jour)}`
                        : depasse ? `${formatLong(jour)} est déjà passé`
                        : formatLong(jour)
                    }
                    onClick={() => creerRappel({ taskId: tache.id, remindOn: jour })}
                  >
                    {dejaPose ? `✓ ${d.nom}` : d.nom}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="menu-note">
              Donne d'abord une échéance à la tâche pour poser un rappel « avant ».
            </p>
          )}

          <label className="menu-champ">
            <span>Un jour précis</span>
            <input
              type="date"
              min={today()}
              value=""
              onChange={(e) => {
                if (e.target.value) creerRappel({ taskId: tache.id, remindOn: e.target.value })
              }}
            />
          </label>

          {mesRappels.length > 0 && (
            <ul className="menu-liste">
              {mesRappels.map((r) => (
                <li key={r.id}>
                  <span>
                    {formatLong(r.remind_on)}
                    <em> · {formatRelative(r.remind_on)}{r.auto ? ' · automatique' : ''}</em>
                  </span>
                  <button
                    type="button" className="lien danger"
                    onClick={() => supprimerRappel(r.id)}
                  >
                    retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Révisions : un interrupteur, sur une tâche source ── */}
        {!tache.revision_of && (
          <div className="menu-bloc">
            <h4>Mode révision</h4>

            {/*
              Un interrupteur et rien d'autre. Il y avait avant un champ
              « date de l'examen » à remplir : une date de plus à saisir, et
              surtout une deuxième date à garder en accord avec celle de la
              tâche. Or une tâche « Contrôle de maths » datée du 20 porte
              déjà la réponse. Les séances s'étalent donc d'aujourd'hui à
              l'échéance de la tâche.
            */}
            <button
              type="button"
              role="switch"
              aria-checked={mesRevisions.length > 0}
              className={`interrupteur${mesRevisions.length ? ' allume' : ''}`}
              disabled={occupe || (!revisionPossible && mesRevisions.length === 0)}
              onClick={basculerRevision}
            >
              <span className="interrupteur-piste"><span className="interrupteur-bouton" /></span>
              <span className="interrupteur-texte">
                <strong>
                  {mesRevisions.length
                    ? `${mesRevisions.length} séance${mesRevisions.length > 1 ? 's' : ''} programmée${mesRevisions.length > 1 ? 's' : ''}`
                    : 'Étaler des révisions'}
                </strong>
                <span>
                  {mesRevisions.length
                    ? "Rappel automatique le jour de chaque séance."
                    : revisionPossible
                      ? `${seancesPrevues} séance${seancesPrevues > 1 ? 's' : ''} d'ici au ${formatLong(tache.due_date)}.`
                      : tache.due_date
                        ? "L'échéance est trop proche pour étaler des révisions."
                        : "Donne d'abord une date à la tâche : c'est elle qui sert d'échéance."}
                </span>
              </span>
            </button>

            {erreur && <p className="menu-note erreur">{erreur}</p>}

            {mesRevisions.length > 0 && (
              <ul className="menu-liste">
                {mesRevisions.map((r) => (
                  <li key={r.id}>
                    <span className={r.is_done ? 'fait' : undefined}>
                      {formatLong(r.due_date)}
                      <em> · {r.is_done ? 'faite' : formatRelative(r.due_date)}</em>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="menu-note">
              Les séances s'espacent de plus en plus : rapprochées au début,
              largement séparées ensuite. C'est le point sur lequel la recherche
              est nette. Les chiffres exacts, eux, sont un choix de réglage.
            </p>
          </div>
        )}

        <hr className="menu-trait" />

        <button
          type="button" className="menu-ligne danger"
          onClick={() => { onFermer(); supprimer(tache.id) }}
        >
          Supprimer la tâche
          {mesRevisions.length > 0 && ` et ses ${mesRevisions.length} révisions`}
        </button>
      </div>
    </MenuFlottant>
  )
}
