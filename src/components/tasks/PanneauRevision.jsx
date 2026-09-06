import { useState } from 'react'
import { useDonnees } from '../../data/DonneesProvider'
import {
  planifierRevisions, planComplet, bornesDuPlan, resumeDuPlan, PLAFOND_SEANCES,
} from '../../lib/revision'
import { formatLong, formatRelative, today } from '../../lib/dates'

/**
 * Le panneau de révision : le rythme, la période, et l'aperçu avant d'agir.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI UN PANNEAU PLUTÔT QU'UN SIMPLE INTERRUPTEUR
 *
 * L'interrupteur imposait un rythme : des écarts croissants, calculés à
 * partir de la courbe de l'oubli. C'est le meilleur défaut et il reste le
 * défaut — mais « un jour sur deux jusqu'au contrôle » est une demande
 * parfaitement raisonnable, et il n'y avait aucun moyen de l'exprimer.
 *
 * Trois principes tiennent la mise en page :
 *
 * 1. LE CAS SIMPLE RESTE SIMPLE. L'interrupteur est toujours là, en haut,
 *    et il suffit. Les réglages sont repliés derrière « Régler le rythme »
 *    et n'apparaissent que si on les demande.
 *
 * 2. RIEN NE S'APPLIQUE SANS ÊTRE ANNONCÉ. Le nombre de séances et les
 *    premières dates s'affichent AVANT le clic. « Tous les jours » sur
 *    trois mois, c'est 60 tâches ; les découvrir après coup et devoir les
 *    supprimer une par une serait une punition.
 *
 * 3. LES DEUX DATES ONT UN DÉFAUT QUI SUFFIT. Aujourd'hui pour le début,
 *    l'échéance de la tâche pour la fin. Tant qu'on n'y touche pas, elles
 *    suivent la tâche ; les remplir, c'est les figer.
 * ─────────────────────────────────────────────────────────────────────
 */

const PAS_COURANTS = [
  { jours: 1, nom: 'Tous les jours' },
  { jours: 2, nom: 'Un jour sur deux' },
  { jours: 3, nom: 'Tous les 3 jours' },
  { jours: 7, nom: 'Une fois par semaine' },
]

export default function PanneauRevision({ tache }) {
  const { revisionsDe, activerRevision, desactiverRevision } = useDonnees()

  const mesRevisions = revisionsDe(tache.id)
  const active = mesRevisions.length > 0

  const [plan, setPlan] = useState(() => planComplet(tache.revision_plan))
  const [reglages, setReglages] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState(null)

  const change = (champ) => setPlan((p) => ({ ...p, ...champ }))

  const { depart, fin } = bornesDuPlan(plan, tache.due_date, today())
  // Ce que le plan donnerait si on l'appliquait maintenant : c'est cet
  // aperçu qui doit décider l'utilisateur, pas la surprise d'après.
  const apercu = fin ? planifierRevisions(depart, fin, plan) : []
  const possible = apercu.length > 0

  async function basculer() {
    setErreur(null); setOccupe(true)
    const { error } = active
      ? await desactiverRevision(tache)
      : await activerRevision(tache, plan)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

  /** Reprogrammer sans éteindre : remplace les séances à venir. */
  async function appliquer() {
    setErreur(null); setOccupe(true)
    const { error } = await activerRevision(tache, plan)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

  return (
    <div className="menu-bloc">
      <h4>Mode révision</h4>

      <button
        type="button"
        role="switch"
        aria-checked={active}
        className={`interrupteur${active ? ' allume' : ''}`}
        disabled={occupe || (!possible && !active)}
        onClick={basculer}
      >
        <span className="interrupteur-piste"><span className="interrupteur-bouton" /></span>
        <span className="interrupteur-texte">
          <strong>
            {active
              ? `${mesRevisions.length} séance${mesRevisions.length > 1 ? 's' : ''} programmée${mesRevisions.length > 1 ? 's' : ''}`
              : 'Étaler des révisions'}
          </strong>
          <span>
            {active
              ? 'Rappel automatique le jour de chaque séance.'
              : possible
                ? resumeDuPlan(depart, fin, plan)
                : tache.due_date
                  ? "L'échéance est trop proche pour étaler des révisions."
                  : "Donne d'abord une date à la tâche : c'est elle qui sert d'échéance."}
          </span>
        </span>
      </button>

      {tache.due_date && (
        <button
          type="button"
          className="bouton-fin plein-large"
          aria-expanded={reglages}
          onClick={() => setReglages((v) => !v)}
        >
          {reglages ? 'Masquer le rythme' : 'Régler le rythme'}
        </button>
      )}

      {reglages && tache.due_date && (
        <div className="reglages-revision">
          {/* ── Le rythme ── */}
          <div className="segments" role="tablist">
            {[
              { id: 'espacees', nom: 'Espacées' },
              { id: 'reguliere', nom: 'Régulier' },
            ].map((m) => (
              <button
                key={m.id} role="tab" aria-selected={plan.mode === m.id}
                className={`segment${plan.mode === m.id ? ' actif' : ''}`}
                onClick={() => change({ mode: m.id })}
              >{m.nom}</button>
            ))}
          </div>

          {plan.mode === 'espacees' ? (
            <>
              <p className="menu-note">
                Écarts croissants : rapprochés au début, largement séparés
                ensuite. C'est le point sur lequel la recherche est nette ;
                les chiffres exacts sont un choix de réglage.
              </p>
              <label className="menu-champ">
                <span>Nombre de séances</span>
                <select
                  value={plan.nombre ?? ''}
                  onChange={(e) => change({ nombre: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Automatique</option>
                  {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>{n} séances</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <p className="menu-note">
                Un rythme régulier, du début à la fin de la période. Moins
                efficace en théorie que les écarts croissants, mais c'est
                celui qu'on tient quand on a un emploi du temps.
              </p>
              <div className="menu-puces">
                {PAS_COURANTS.map((p) => (
                  <button
                    key={p.jours}
                    type="button"
                    className={`puce${plan.tousLes === p.jours ? ' posee' : ''}`}
                    aria-pressed={plan.tousLes === p.jours}
                    onClick={() => change({ tousLes: p.jours })}
                  >{p.nom}</button>
                ))}
              </div>
              <label className="menu-champ">
                <span>Ou tous les</span>
                <input
                  type="number" min="1" max="30" inputMode="numeric"
                  value={plan.tousLes}
                  onChange={(e) => change({ tousLes: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
                  aria-label="Nombre de jours entre deux séances"
                />
              </label>
            </>
          )}

          {/* ── La période ── */}
          <label className="menu-champ">
            <span>Du</span>
            <input
              type="date"
              value={plan.debut ?? today()}
              min={today()}
              onChange={(e) => change({ debut: e.target.value || null })}
            />
          </label>

          <label className="menu-champ">
            <span>Au</span>
            <input
              type="date"
              value={plan.fin ?? tache.due_date ?? ''}
              max={tache.due_date ?? undefined}
              onChange={(e) => change({ fin: e.target.value || null })}
            />
          </label>
          <p className="menu-note">
            Par défaut : d'aujourd'hui à l'échéance de la tâche
            ({formatLong(tache.due_date)}). Aucune séance n'est posée le jour
            même du contrôle — c'est ce jour-là qu'il faut être prêt, pas
            réviser.
          </p>

          <label className="menu-bascule">
            <input
              type="checkbox"
              checked={plan.sansWeekend}
              onChange={(e) => change({ sansWeekend: e.target.checked })}
            />
            <span>
              <strong>Pas le week-end</strong>
              <span className="menu-note">
                {plan.mode === 'reguliere'
                  ? 'Le rythme se compte alors en jours de semaine.'
                  : 'Une séance tombée un samedi est reportée au lundi.'}
              </span>
            </span>
          </label>

          {/* ── L'aperçu, avant d'appliquer ── */}
          <div className={`apercu-plan${apercu.length >= PLAFOND_SEANCES ? ' plein' : ''}`}>
            <strong>
              {apercu.length === 0
                ? 'Aucune séance ne tient dans cette période.'
                : `${apercu.length} séance${apercu.length > 1 ? 's' : ''}`}
            </strong>
            {apercu.length > 0 && (
              <span className="apercu-dates">
                {apercu.slice(0, 4).map((j) => formatLong(j).replace(/^\w+ /, '')).join(' · ')}
                {apercu.length > 4 && ` … ${formatRelative(apercu[apercu.length - 1])}`}
              </span>
            )}
            {apercu.length >= PLAFOND_SEANCES && (
              <span className="apercu-dates">
                Limité à {PLAFOND_SEANCES} séances : au-delà, ce sont des
                dizaines de tâches à supprimer une par une si tu changes d'avis.
              </span>
            )}
          </div>

          <button
            type="button"
            className="bouton-plein plein-large"
            disabled={occupe || !possible}
            onClick={appliquer}
          >
            {active ? 'Reprogrammer les séances' : 'Créer les séances'}
          </button>
          {active && (
            <p className="menu-note">
              Les séances déjà cochées sont conservées ; seules celles à venir
              sont remplacées.
            </p>
          )}
        </div>
      )}

      {erreur && <p className="menu-note erreur">{erreur}</p>}

      {active && (
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
    </div>
  )
}
