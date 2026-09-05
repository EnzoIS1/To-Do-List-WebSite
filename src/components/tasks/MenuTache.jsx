import { useState } from 'react'
import MenuFlottant from '../ui/MenuFlottant'
import {
  useDonnees, DECALAGES_RAPPEL, jourDuRappel,
} from '../../data/DonneesProvider'
import { resumeDeRevision } from '../../lib/revision'
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

  const [examen, setExamen] = useState(tache.exam_date ?? '')
  const [erreur, setErreur] = useState(null)
  const [occupe, setOccupe] = useState(false)

  const mesRappels = rappelsDe(tache.id)
  const mesRevisions = revisionsDe(tache.id)
  const source = tache.revision_of ? tasks.find((t) => t.id === tache.revision_of) : null

  async function lancerRevision() {
    setErreur(null); setOccupe(true)
    const { error } = await activerRevision(tache, examen)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

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
                return (
                  <button
                    key={d.id}
                    type="button"
                    className="puce"
                    disabled={depasse}
                    title={depasse ? `${formatLong(jour)} est déjà passé` : formatLong(jour)}
                    onClick={() => creerRappel({ taskId: tache.id, remindOn: jour })}
                  >
                    {d.nom}
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
                    <em> · {formatRelative(r.remind_on)}</em>
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

        {/* ── Révisions : seulement sur une tâche source ── */}
        {!tache.revision_of && (
          <div className="menu-bloc">
            <h4>Révisions espacées</h4>

            <label className="menu-champ">
              <span>Date de l'examen</span>
              <input
                type="date"
                value={examen}
                min={tache.due_date ?? today()}
                onChange={(e) => { setExamen(e.target.value); setErreur(null) }}
              />
            </label>

            {examen && (
              <p className="menu-note">
                {resumeDeRevision(tache.due_date ?? today(), examen)}
              </p>
            )}
            {erreur && <p className="menu-note erreur">{erreur}</p>}

            <div className="menu-puces">
              <button
                type="button" className="puce pleine"
                disabled={!examen || occupe}
                onClick={lancerRevision}
              >
                {mesRevisions.length ? 'Reprogrammer' : 'Créer les révisions'}
              </button>
              {mesRevisions.length > 0 && (
                <button
                  type="button" className="puce"
                  onClick={() => { setExamen(''); desactiverRevision(tache) }}
                >
                  Arrêter
                </button>
              )}
            </div>

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
