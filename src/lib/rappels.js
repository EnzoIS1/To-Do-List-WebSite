import { addDays, daysBetween, fromDateKey } from './dates.js'

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
 * Le samedi et le dimanche qui PRÉCÈDENT une échéance.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE CAS MÉRITE SON PROPRE CALCUL
 *
 * « Trois jours avant » tombe n'importe quel jour de la semaine — en
 * plein cours, en pleine réunion, un mardi à 7 h du matin. Le week-end
 * est le moment où on a le temps de s'y mettre, et sa distance à
 * l'échéance change selon le jour de celle-ci : pour un rendu le mardi,
 * c'est trois jours avant ; pour un rendu le vendredi, c'est six.
 * Aucun décalage fixe ne peut l'exprimer, d'où cette fonction.
 *
 * LA RÈGLE : LE DERNIER WEEK-END STRICTEMENT AVANT L'ÉCHÉANCE
 *
 * Un rendu le lundi est annoncé par le week-end de la veille. Un rendu
 * le samedi est annoncé par le week-end d'AVANT — pas par lui-même : un
 * rappel le jour de l'échéance ne laisse pas le temps de travailler,
 * c'est ce que le rappel du jour même sert déjà à faire.
 *
 * Le dimanche renvoyé est donc toujours STRICTEMENT antérieur à
 * l'échéance, et le samedi est la veille de ce dimanche.
 * ─────────────────────────────────────────────────────────────────────
 *
 * @param {string} echeance 'AAAA-MM-JJ'
 * @returns {{samedi: string, dimanche: string}}
 */
export function weekEndAvant(echeance) {
  const d = fromDateKey(echeance)
  // 1 = lundi … 7 = dimanche.
  const iso = d.getDay() === 0 ? 7 : d.getDay()
  /*
   * Combien de jours reculer pour tomber sur le dimanche précédent,
   * strictement. Lundi (1) recule de 1 ; dimanche (7) recule de 7, donc
   * sur le dimanche d'avant, jamais sur lui-même.
   */
  const recul = iso === 7 ? 7 : iso
  const dimanche = addDays(echeance, -recul)
  return { samedi: addDays(dimanche, -1), dimanche }
}

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

  // Le week-end d'avant : on le reconnaît à la position du jour, pas à
  // l'écart — qui vaut 3 jours pour un rendu le mardi et 6 pour un
  // vendredi. Sans ça, ces rappels s'afficheraient « 6 jours avant » et
  // seraient impossibles à relier au bouton qui les a posés.
  const we = weekEndAvant(echeance)
  if (remindOn === we.samedi) return "Samedi d'avant"
  if (remindOn === we.dimanche) return "Dimanche d'avant"

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

/**
 * UN SEUL RAPPEL PAR TÂCHE, parmi ceux qui sont déjà dus.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LE DOUBLON, VU DE L'UTILISATEUR
 *
 * Une tâche peut porter plusieurs rappels — « une semaine avant » ET
 * « la veille », par exemple. C'est voulu : ils ne tombent pas le même
 * jour. Mais dès qu'on n'ouvre pas le site pendant quelques jours, les
 * deux sont dus en même temps, et la liste affiche deux fois la même
 * tâche. Pour qui la lit, ce sont des doublons, même si la base a
 * raison.
 *
 * LEQUEL ON GARDE, ET POURQUOI LE PLUS RÉCENT
 *
 * Celui dont la date est la plus proche de l'échéance. « La veille » dit
 * quelque chose de plus utile que « une semaine avant » quand les deux
 * sont en retard : il décrit où on en est VRAIMENT, pas où on en était.
 *
 * ON NE SUPPRIME RIEN. Les autres rappels restent en base ; ils sont
 * simplement masqués tant que la tâche est déjà représentée. Écarter la
 * ligne visible écarte d'ailleurs ce rappel-là seulement — les autres
 * réapparaîtront, ce qui est le comportement attendu puisqu'ils
 * n'annoncent pas la même échéance.
 * ─────────────────────────────────────────────────────────────────────
 *
 * @param {{rappel: object, tache: object}[]} lignes
 * @returns {{rappel: object, tache: object}[]} dans l'ordre reçu
 */
export function sansDoublonsDeTache(lignes) {
  const meilleur = new Map()
  for (const ligne of lignes) {
    const cle = ligne.rappel.task_id
    const garde = meilleur.get(cle)
    if (!garde || ligne.rappel.remind_on > garde.rappel.remind_on) {
      meilleur.set(cle, ligne)
    }
  }
  // On respecte l'ordre d'arrivée : l'appelant a déjà trié, ce n'est pas
  // à cette fonction de décider de l'affichage.
  const gardes = new Set([...meilleur.values()])
  return lignes.filter((l) => gardes.has(l))
}
