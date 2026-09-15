import { useState } from 'react'
import { useDonnees, estCategorieCourses } from '../../data/DonneesProvider'
import SelecteurListe from '../ui/SelecteurListe'
import {
  RYTHMES_COURANTS, UNITES, libelleRythme, resumeRecurrence, avancer,
} from '../../lib/recurrence'
import { formatLong, today } from '../../lib/dates'

/**
 * « Répéter cette tâche » — le panneau de récurrence.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI IL EST DANS LE MENU D'UNE TÂCHE
 *
 * Parce que c'est là qu'on y pense. On n'ouvre pas un écran « gérer mes
 * récurrences » pour décider que le fromage revient tous les mois : on
 * regarde le fromage qu'on vient d'ajouter, et on se dit qu'il reviendra.
 * La tâche sous les yeux sert de modèle — son titre, sa quantité, sa
 * catégorie — et il n'y a rien à ressaisir.
 *
 * LES DEUX FORMES, ET POURQUOI ELLES SONT LE MÊME RÉGLAGE
 *
 * « Du fromage tous les mois » n'a pas de fin. « La même tâche tous les
 * jours pendant une semaine » en a une. C'est la SEULE différence entre
 * les deux demandes : un champ de date, laissé vide ou rempli.
 *
 * L'ÉCHÉANCE EST UN CHOIX, PAS UNE DÉDUCTION
 *
 * Une tâche datée déclenche le rappel automatique de la veille. Sur une
 * révision c'est le but ; sur une liste de courses, ça notifierait toutes
 * les semaines sans que personne l'ait demandé. La case est donc décochée
 * par défaut dans la catégorie Courses, cochée ailleurs — mais elle reste
 * une case, visible et modifiable, jamais une règle cachée.
 *
 * RIEN NE S'APPLIQUE SANS ÊTRE ANNONCÉ
 *
 * Le résumé et la première occurrence s'affichent AVANT le clic, comme
 * pour les révisions. « Tous les jours » avec une fin dans trois mois,
 * c'est quatre-vingt-dix tâches ; les découvrir après coup serait une
 * punition.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function PanneauRecurrence({ tache }) {
  const {
    categories, recurrences: regles, recurrenceDe,
    creerRecurrence, supprimerRecurrence, modifierRecurrence, modifier,
  } = useDonnees()

  // La tâche est-elle déjà une occurrence d'une règle existante ?
  const regleExistante = tache.recurrence_id ? recurrenceDe(tache.recurrence_id) : null
  // Ou bien est-elle elle-même le modèle d'une règle posée depuis elle ?
  const dejaPosee = regles.find((r) => r.actif && r.title === tache.title)

  const categorie = categories.find((c) => c.id === tache.category_id)
  const dansLesCourses = categorie ? estCategorieCourses(categorie) : false

  const [ouvert, setOuvert] = useState(false)
  const [tousLes, setTousLes] = useState(1)
  const [unite, setUnite] = useState(dansLesCourses ? 'semaine' : 'jour')
  const [fin, setFin] = useState('')
  const [avecEcheance, setAvecEcheance] = useState(!dansLesCourses)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState(null)

  const debut = tache.due_date && tache.due_date > today() ? tache.due_date : today()
  const apercu = { tous_les: tousLes, unite, debut, fin: fin || null }
  const suivante = avancer(debut, tousLes, unite, debut)

  async function poser() {
    setErreur(null); setOccupe(true)
    const { data, error } = await creerRecurrence({
      title: tache.title,
      quantity: tache.quantity ?? null,
      category_id: tache.category_id ?? null,
      tous_les: tousLes,
      unite,
      debut,
      fin: fin || null,
      avec_echeance: avecEcheance,
      // La tâche qu'on a sous les yeux EST la première occurrence : le
      // curseur part donc de la suivante. Sans ça, on obtiendrait un
      // doublon immédiat de la tâche qui a servi de modèle.
      prochaine: suivante,
    })
    if (!error && data) {
      // On rattache la tâche modèle à sa règle : c'est ce qui fait
      // apparaître « ↻ » dessus et permet d'arrêter depuis n'importe
      // laquelle de ses occurrences.
      await modifier(tache.id, { recurrence_id: data.id })
    }
    setOccupe(false)
    if (error) setErreur(error.message)
    else setOuvert(false)
  }

  async function arreter(id) {
    setErreur(null); setOccupe(true)
    const { error } = await supprimerRecurrence(id)
    setOccupe(false)
    if (error) setErreur(error.message)
  }

  /* ── La tâche vient d'une règle : on montre la règle, pas un formulaire ── */
  if (regleExistante) {
    return (
      <div className="menu-bloc">
        <h4>Répétition</h4>
        <p className="menu-note">
          Cette tâche revient : <strong>{libelleRythme(regleExistante.tous_les, regleExistante.unite)}</strong>.
          {regleExistante.actif
            ? ` Prochaine fois le ${formatLong(regleExistante.prochaine)}.`
            : ' La série est terminée.'}
        </p>
        <div className="menu-puces">
          {regleExistante.actif && (
            <button
              type="button" className="puce" disabled={occupe}
              onClick={() => modifierRecurrence(regleExistante.id, { actif: false })}
            >
              Mettre en pause
            </button>
          )}
          {!regleExistante.actif && (
            <button
              type="button" className="puce" disabled={occupe}
              onClick={() => modifierRecurrence(regleExistante.id, {
                actif: true,
                // On ne remonte pas le temps : reprendre une série en pause
                // ne doit pas fabriquer tout ce qui a été manqué.
                prochaine: regleExistante.prochaine > today() ? regleExistante.prochaine : today(),
              })}
            >
              Reprendre
            </button>
          )}
          <button
            type="button" className="puce danger" disabled={occupe}
            onClick={() => arreter(regleExistante.id)}
          >
            Arrêter la répétition
          </button>
        </div>
        <p className="menu-note">
          Arrêter supprime la règle, pas les tâches déjà créées — elles
          restent dans ta liste.
        </p>
        {erreur && <p className="menu-note erreur">{erreur}</p>}
      </div>
    )
  }

  /* ── Sinon : le formulaire ── */
  return (
    <div className="menu-bloc">
      <h4>Répétition</h4>

      {/*
        Une règle du même titre existe déjà ? On le DIT, on ne l'interdit
        pas. Le rapprochement se fait sur le titre, et deux tâches peuvent
        légitimement porter le même — bloquer sur cette base reviendrait à
        refuser une action correcte à cause d'une homonymie.
      */}
      {dejaPosee && (
        <p className="menu-note">
          Attention : une répétition existe déjà pour « {dejaPosee.title} » —{' '}
          {libelleRythme(dejaPosee.tous_les, dejaPosee.unite).toLowerCase()}, prochaine
          fois le {formatLong(dejaPosee.prochaine)}.
        </p>
      )}

      <button
        type="button"
        className="bouton-fin plein-large"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
      >
        {ouvert ? 'Annuler' : 'Répéter cette tâche'}
      </button>

      {ouvert && (
        <div className="reglages-revision">
          <div className="menu-puces">
            {RYTHMES_COURANTS.map((r) => {
              const actif = r.tousLes === tousLes && r.unite === unite
              return (
                <button
                  key={r.nom}
                  type="button"
                  className={`puce${actif ? ' posee' : ''}`}
                  aria-pressed={actif}
                  onClick={() => { setTousLes(r.tousLes); setUnite(r.unite) }}
                >{r.nom}</button>
              )
            })}
          </div>

          <label className="menu-champ">
            <span>Ou tous les</span>
            <input
              type="number" min="1" max="60" inputMode="numeric"
              value={tousLes}
              onChange={(e) => setTousLes(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              aria-label="Nombre d'unités entre deux occurrences"
            />
          </label>

          <div className="menu-champ">
            <span>Unité</span>
            <SelecteurListe
              etiquette="Unité de répétition"
              valeur={unite}
              options={UNITES.map((u) => ({ id: u.id, nom: u.pluriel }))}
              onChoisir={(v) => setUnite(v)}
            />
          </div>

          <label className="menu-champ">
            <span>Jusqu'au</span>
            <input
              type="date"
              min={debut}
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              aria-label="Dernier jour de la répétition"
            />
          </label>
          <p className="menu-note">
            Laisse vide pour que ça ne s'arrête jamais — c'est ce qu'on veut
            pour une liste de courses.
          </p>

          <label className="menu-champ">
            <span>Donner une échéance à chaque fois</span>
            <input
              type="checkbox"
              checked={avecEcheance}
              onChange={(e) => setAvecEcheance(e.target.checked)}
            />
          </label>
          <p className="menu-note">
            {avecEcheance
              ? 'Chaque occurrence sera datée du jour où elle apparaît — et rappelée la veille.'
              : 'Les occurrences arrivent sans date, donc sans rappel. C\'est ce qu\'il faut pour des courses.'}
          </p>

          <p className="apercu-plan">
            {resumeRecurrence(apercu)} Première répétition le {formatLong(suivante)}.
          </p>

          <button
            type="button" className="bouton-plein plein-large"
            disabled={occupe}
            onClick={poser}
          >
            Répéter {libelleRythme(tousLes, unite).toLowerCase()}
          </button>
          {erreur && <p className="menu-note erreur">{erreur}</p>}
        </div>
      )}
    </div>
  )
}
