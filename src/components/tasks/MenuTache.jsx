import { useState } from 'react'
import MenuFlottant from '../ui/MenuFlottant'
import SelecteurListe from '../ui/SelecteurListe'
import PanneauRevision from './PanneauRevision'
import PanneauRecurrence from './PanneauRecurrence'
import { useDonnees } from '../../data/DonneesProvider'
import { DECALAGES_RAPPEL, jourDuRappel, libelleRappel } from '../../lib/rappels'
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
    rappelsDe, creerRappel, supprimerRappel, basculerRappelAuto,
    revisionsDe, tasks, fonctionActive,
  } = useDonnees()

  const mesRappels = rappelsDe(tache.id)
  const mesRevisions = revisionsDe(tache.id)
  const source = tache.revision_of ? tasks.find((t) => t.id === tache.revision_of) : null

  // Le titre s'édite ici, en local, et n'est envoyé qu'à la validation.
  // Enregistrer à chaque frappe ferait une requête par lettre.
  const [titre, setTitre] = useState(tache.title)

  function enregistrerTitre() {
    const propre = titre.trim()
    // Un titre vide effacerait la tâche de la liste sans la supprimer :
    // on revient à l'ancien plutôt que d'enregistrer du vide.
    if (!propre) return setTitre(tache.title)
    if (propre !== tache.title) modifier(tache.id, { title: propre })
  }

  /*
   * LE JOUR PRÉCIS : CHOISIR, PUIS VALIDER
   *
   * Avant, le champ posait le rappel sur l'évènement `change` du champ de
   * date. Sur ordinateur c'est invisible ; sur téléphone c'est un bug :
   * le sélecteur natif s'ouvre sur la date du jour et la valide dès qu'on
   * le touche, avant même d'avoir choisi. Résultat, un rappel pour
   * aujourd'hui apparaissait tout seul.
   *
   * Le champ ne fait donc plus qu'une chose : retenir la date. C'est le
   * bouton qui pose le rappel. Un geste de plus, mais plus aucun rappel
   * qu'on n'a pas demandé.
   */
  const [jourChoisi, setJourChoisi] = useState('')
  const dejaPose = mesRappels.some((r) => r.remind_on === jourChoisi)

  function poserLeJour() {
    if (!jourChoisi || dejaPose) return
    creerRappel({ taskId: tache.id, remindOn: jourChoisi })
    setJourChoisi('')
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

        {/*
          ── Le titre ──
          Il n'était modifiable nulle part : une faute de frappe à la
          création restait à vie, et comme c'est ce titre qui s'affiche
          dans la liste des rappels et dans la notification, la faute se
          répétait à chaque rappel. Il se corrige donc ici, au même
          endroit que le reste des réglages de la tâche.
        */}
        <label className="menu-champ empile">
          <span>Titre</span>
          <input
            type="text"
            value={titre}
            maxLength={500}
            onChange={(e) => setTitre(e.target.value)}
            onBlur={enregistrerTitre}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
              if (e.key === 'Escape') setTitre(tache.title)
            }}
          />
        </label>

        {/* ── Catégorie : disponible partout, même sur une tâche cochée ── */}
        <div className="menu-champ">
          <span>Catégorie</span>
          <SelecteurListe
            etiquette="Catégorie"
            valeur={tache.category_id ?? ''}
            options={[
              { id: '', nom: 'Sans catégorie' },
              ...choixCategories.map((c) => ({ id: c.id, nom: c.chemin ?? c.name })),
            ]}
            onChoisir={(id) => modifier(tache.id, { category_id: id || null })}
          />
        </div>

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
              : 'Une tâche datée se rappelle la veille, automatiquement. Chaque puce s\'allume et s\'éteint : clique dessus pour poser le rappel, reclique pour le retirer.'}
          </p>

          {tache.due_date && DECALAGES_RAPPEL.every((d) => isPast(jourDuRappel(tache.due_date, d.jours))) && (
            <p className="menu-note">
              L'échéance est trop proche pour un rappel « avant » : choisis un
              jour précis ci-dessous.
            </p>
          )}

          {tache.due_date ? (
            <div className="menu-puces">
              {/*
                Chaque puce est un interrupteur : elle pose le rappel, et
                elle le retire. Avant, une puce cochée était simplement
                désactivée — on pouvait mettre « 3 jours avant » mais plus
                jamais l'enlever, sauf à aller chercher la ligne dans la
                liste du dessous. Un bouton qui ne sait qu'aller dans un
                sens n'est pas un réglage, c'est un piège.

                Cas particulier du rappel automatique de la veille : il
                n'appartient pas à l'utilisateur, c'est la base qui le pose.
                Le supprimer ne tiendrait pas — le trigger le repose à la
                modification suivante. On bascule donc `rappel_auto` sur la
                tâche (migration 0007), qui est le seul refus qui survive.
              */}
              {DECALAGES_RAPPEL.map((d) => {
                const jour = jourDuRappel(tache.due_date, d.jours)
                const depasse = isPast(jour)
                const pose = mesRappels.find((r) => r.remind_on === jour)
                // La veille d'une tâche ordinaire, c'est le rappel automatique.
                const estLAuto = !tache.revision_of && d.jours === 1
                const autoCoupe = estLAuto && tache.rappel_auto === false

                const retirer = () => (pose?.auto || estLAuto)
                  ? basculerRappelAuto(tache, false)
                  : supprimerRappel(pose.id)

                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`puce${pose ? ' posee' : ''}`}
                    aria-pressed={Boolean(pose)}
                    disabled={!pose && depasse && !autoCoupe}
                    title={
                      pose ? `Posé le ${formatLong(jour)} — cliquer pour retirer`
                        : autoCoupe ? 'Remettre le rappel automatique de la veille'
                        : depasse ? `${formatLong(jour)} est déjà passé`
                        : formatLong(jour)
                    }
                    onClick={() => {
                      if (pose) return retirer()
                      if (autoCoupe) return basculerRappelAuto(tache, true)
                      return creerRappel({ taskId: tache.id, remindOn: jour })
                    }}
                  >
                    {pose ? `✓ ${d.nom}` : d.nom}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="menu-note">
              Donne d'abord une échéance à la tâche pour poser un rappel « avant ».
            </p>
          )}

          <div className="menu-champ empile">
            <span>Un jour précis</span>
            <div className="champ-et-action">
              <input
                type="date"
                min={today()}
                value={jourChoisi}
                aria-label="Jour du rappel"
                onChange={(e) => setJourChoisi(e.target.value)}
              />
              <button
                type="button"
                className="bouton-plein"
                disabled={!jourChoisi || dejaPose}
                onClick={poserLeJour}
              >
                {dejaPose ? 'Déjà posé' : 'Ajouter'}
              </button>
            </div>
          </div>

          {mesRappels.length > 0 && (
            <ul className="menu-liste">
              {/*
                L'intitulé d'abord, la date ensuite. « Rappel du 17 » oblige
                à retrouver l'échéance et à faire la soustraction ; « La
                veille » se lit d'un coup. La date reste juste derrière,
                parce que c'est elle qui répond à « c'est quand, au juste ».
              */}
              {mesRappels.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>{libelleRappel(r.remind_on, tache.due_date)}</strong>
                    <em> · {formatLong(r.remind_on)} · {formatRelative(r.remind_on)}
                      {r.auto ? ' · automatique' : ''}</em>
                  </span>
                  <button
                    type="button" className="bouton-fin danger"
                    onClick={() => (r.auto
                      ? basculerRappelAuto(tache, false)
                      : supprimerRappel(r.id))}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Répétition : le même moteur sert les courses et les tâches ── */}
        {!tache.revision_of && <PanneauRecurrence tache={tache} />}

        {/* ── Révisions : le rythme est réglable, voir PanneauRevision ── */}
        {!tache.revision_of && fonctionActive('revision') && <PanneauRevision tache={tache} />}

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
