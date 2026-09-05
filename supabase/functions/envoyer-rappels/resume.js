/**
 * Composition du message de la notification.
 *
 * Séparé du reste pour une raison simple : c'est la seule partie de la
 * fonction serveur que je peux vraiment tester ici. Le chiffrement est
 * vérifié par webpush.test.mjs, la sélection des rappels par un vrai
 * PostgreSQL, et ce fichier par resume.test.mjs. Ce qui reste sans filet,
 * c'est uniquement la plomberie HTTP entre les trois.
 */

/** Au-delà, un service de notification peut refuser le message. */
export const TAILLE_MAX = 1800

/**
 * Toutes les notifications du résumé portent la même étiquette. C'est ce
 * qui garantit qu'il n'y en a jamais deux empilées : selon la norme des
 * notifications, une nouvelle notification portant une étiquette déjà
 * présente REMPLACE l'ancienne au lieu de s'ajouter.
 */
export const ETIQUETTE = 'resume-du-jour'

/** Coupe proprement un titre trop long, sur un mot si possible. */
function raccourcir(texte, max) {
  if (texte.length <= max) return texte
  const coupe = texte.slice(0, max - 1)
  const espace = coupe.lastIndexOf(' ')
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd() + '…'
}

/**
 * Construit le contenu de la notification groupée.
 *
 * @param {string[]} titres  les titres des tâches concernées, déjà triés
 * @param {string} [lien]    l'adresse à ouvrir au clic
 * @returns {{titre: string, corps: string, tag: string, url: string}|null}
 *          null s'il n'y a rien à annoncer — dans ce cas on n'envoie PAS de
 *          notification. Recevoir « 0 rappel aujourd'hui » tous les matins
 *          est le meilleur moyen de faire désactiver les notifications.
 */
export function composerResume(titres, lien = '/') {
  const propres = titres.map((t) => (t ?? '').trim()).filter(Boolean)
  if (propres.length === 0) return null

  const titre = propres.length === 1
    ? '1 rappel aujourd\'hui'
    : `${propres.length} rappels aujourd'hui`

  // On aligne les titres tant qu'ils tiennent, puis on annonce le reste.
  // Un corps tronqué en plein milieu d'un mot donne l'impression d'un bug.
  const gardes = []
  let longueur = 0
  for (const t of propres) {
    const court = raccourcir(t, 70)
    const ajout = (gardes.length ? 3 : 0) + court.length
    // On garde de la place pour la mention « et N autres ».
    if (longueur + ajout > TAILLE_MAX - 40 && gardes.length > 0) break
    gardes.push(court)
    longueur += ajout
  }

  const restants = propres.length - gardes.length
  const corps = gardes.join(' · ') +
    (restants > 0 ? ` … et ${restants} autre${restants > 1 ? 's' : ''}` : '')

  return { titre, corps, tag: ETIQUETTE, url: lien }
}
