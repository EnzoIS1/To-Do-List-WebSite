import { addDays, daysBetween } from './dates.js'

/**
 * Le vocabulaire des rappels, au même endroit pour tout le monde.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 *
 * Un rappel ne porte qu'une date : `remind_on`. C'est suffisant pour la
 * base, mais illisible à l'écran — « Rappel du 17 septembre » oblige à
 * aller chercher l'échéance de la tâche et à faire la soustraction de
 * tête pour comprendre de quoi il s'agit. L'intitulé, lui, se lit d'un
 * coup : « la veille », « 3 jours avant ».
 *
 * Le libellé se DÉDUIT donc de l'écart entre le rappel et l'échéance,
 * plutôt que d'être stocké. Deux raisons : les rappels déjà en base
 * n'ont aucun libellé enregistré, et surtout un libellé figé mentirait
 * dès que l'échéance bouge — « la veille » resterait écrit sur un rappel
 * qui tomberait alors trois jours avant.
 *
 * Ces fonctions ne dépendent que de lib/dates : elles sont utilisables
 * partout, y compris hors React, et testables sans navigateur.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Les décalages proposés dans le menu « Rappel » d'une tâche datée. */
export const DECALAGES_RAPPEL = [
  { id: 'veille', nom: 'La veille', jours: 1 },
  { id: 'trois', nom: '3 jours avant', jours: 3 },
  { id: 'semaine', nom: '1 semaine avant', jours: 7 },
  { id: 'deux-semaines', nom: '2 semaines avant', jours: 14 },
]

/** Le jour d'un rappel posé « n jours avant » une échéance. */
export const jourDuRappel = (echeance, jours) => addDays(echeance, -jours)

/**
 * L'intitulé d'un rappel : « La veille », « 3 jours avant », « Le jour
 * même »…
 *
 * Les décalages connus reprennent EXACTEMENT le nom de leur puce dans le
 * menu — c'est ce qui permet de reconnaître, dans la page Rappels, le
 * bouton sur lequel on avait appuyé. Un écart quelconque est décrit tel
 * quel (« 5 jours avant ») ; une tâche sans échéance ne peut être décrite
 * que par « Jour choisi », puisqu'il n'y a rien pour mesurer un avant.
 *
 * @param {string} remindOn  jour du rappel, 'AAAA-MM-JJ'
 * @param {string|null} echeance  échéance de la tâche
 * @returns {string}
 */
export function libelleRappel(remindOn, echeance) {
  if (!echeance) return 'Jour choisi'

  const avant = daysBetween(remindOn, echeance)
  if (avant === 0) return 'Le jour même'
  if (avant < 0) return `${-avant} jour${-avant > 1 ? 's' : ''} après`

  const connu = DECALAGES_RAPPEL.find((d) => d.jours === avant)
  if (connu) return connu.nom

  if (avant % 7 === 0) {
    const semaines = avant / 7
    return `${semaines} semaine${semaines > 1 ? 's' : ''} avant`
  }
  return `${avant} jours avant`
}

/**
 * La phrase courte affichée sous le titre d'une tâche rappelée.
 *
 * « La veille · automatique » dit tout : ce que le rappel annonce, et
 * qu'il n'a pas été posé à la main — donc que le retirer se fera par la
 * même puce que celle qui l'aurait posé.
 */
export function detailRappel(rappel, tache) {
  const morceaux = [libelleRappel(rappel.remind_on, tache?.due_date ?? null)]
  if (rappel.auto) morceaux.push('automatique')
  return morceaux.join(' · ')
}
