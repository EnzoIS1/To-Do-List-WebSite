import { addDays, fromDateKey, toDateKey, today } from './dates.js'

/**
 * La récurrence : une chose qui revient toute seule.
 *
 * ─────────────────────────────────────────────────────────────────────
 * UN SEUL MOTEUR POUR DEUX DEMANDES
 *
 * « Du fromage tous les mois dans la liste de courses » et « la même
 * tâche tous les jours pendant une semaine » ressemblent à deux
 * fonctionnalités. C'en est une seule : un modèle, un rythme, et des
 * tâches fabriquées à partir de lui. Les articles de courses SONT des
 * tâches — rangées dans la catégorie Courses, sans échéance — donc rien
 * à écrire deux fois.
 *
 * La seule vraie différence est la date de fin : « pendant une semaine »
 * en a une, « tous les mois » n'en a pas.
 *
 * CE QUI EST STOCKÉ, ET CE QUI NE L'EST PAS
 *
 * On garde la RÈGLE (tous les N jours/semaines/mois, de telle date à
 * telle date) et UN CURSEUR : `prochaine`, la date de la prochaine
 * occurrence à fabriquer. On ne garde pas la liste des occurrences
 * passées — elle est déjà en base, ce sont les tâches elles-mêmes.
 *
 * Le curseur est ce qui rend l'opération REJOUABLE SANS DOUBLON : tant
 * qu'il n'a pas avancé, rien n'a été créé ; une fois avancé, la même
 * occurrence ne peut plus revenir. Sans lui, il faudrait comparer les
 * dates avec les tâches existantes à chaque ouverture, et deux onglets
 * ouverts en même temps créeraient deux fois la même chose.
 *
 * QUAND LES OCCURRENCES SONT FABRIQUÉES — ET LA LIMITE, ANNONCÉE
 *
 * À l'ouverture du site, pas par le serveur. Concrètement : si tu
 * n'ouvres pas le site pendant trois semaines, le fromage de la semaine
 * dernière n'apparaît pas pendant ces trois semaines — il apparaît à la
 * réouverture, avec les autres. Pour une liste de courses et des tâches
 * à faire, c'est sans conséquence : on les lit quand on ouvre le site.
 *
 * Je préfère l'écrire que le laisser découvrir. Le faire côté serveur
 * est possible — le planificateur existe déjà pour les notifications —
 * mais ça n'apporterait rien tant qu'il n'y a pas de notification pour
 * les récurrences.
 * ─────────────────────────────────────────────────────────────────────
 */

export const UNITES = [
  { id: 'jour', nom: 'jour', pluriel: 'jours' },
  { id: 'semaine', nom: 'semaine', pluriel: 'semaines' },
  { id: 'mois', nom: 'mois', pluriel: 'mois' },
]

/** Les rythmes d'un clic, ceux qu'on choisit neuf fois sur dix. */
export const RYTHMES_COURANTS = [
  { nom: 'Tous les jours', tousLes: 1, unite: 'jour' },
  { nom: 'Un jour sur deux', tousLes: 2, unite: 'jour' },
  { nom: 'Toutes les semaines', tousLes: 1, unite: 'semaine' },
  { nom: 'Tous les mois', tousLes: 1, unite: 'mois' },
]

/**
 * Au maximum 30 occurrences rattrapées d'un coup.
 *
 * Sans plafond, une récurrence quotidienne laissée un an sans ouvrir le
 * site fabriquerait 365 tâches à la réouverture. Personne ne veut
 * rattraper un an de fromage : ce qui compte, c'est que la chose
 * réapparaisse, pas qu'elle réapparaisse 365 fois.
 */
export const PLAFOND_RATTRAPAGE = 30

/**
 * La date suivante, dans le rythme donné.
 *
 * Le cas des mois demande une précaution : le 31 janvier + 1 mois n'existe
 * pas. `new Date(2026, 1, 31)` déborderait silencieusement sur le 3 mars,
 * et une récurrence posée le 31 se mettrait à dériver d'un mois sur
 * l'autre. On rabat donc sur le dernier jour du mois visé — le 28, puis
 * le 31 de nouveau au mois suivant, puisque le calcul repart toujours du
 * même jour de référence.
 */
export function avancer(jour, tousLes, unite, reference = jour) {
  const pas = Math.max(1, Math.min(60, Number(tousLes) || 1))
  if (unite === 'jour') return addDays(jour, pas)
  if (unite === 'semaine') return addDays(jour, pas * 7)

  // Mois : on repart du jour de référence pour ne pas accumuler l'erreur.
  const ref = fromDateKey(reference)
  const cur = fromDateKey(jour)
  const moisEcoules =
    (cur.getFullYear() - ref.getFullYear()) * 12 + (cur.getMonth() - ref.getMonth())
  const cible = moisEcoules + pas
  const an = ref.getFullYear() + Math.floor((ref.getMonth() + cible) / 12)
  const mois = ((ref.getMonth() + cible) % 12 + 12) % 12
  const dernier = new Date(an, mois + 1, 0).getDate()
  return toDateKey(new Date(an, mois, Math.min(ref.getDate(), dernier)))
}

/**
 * Les occurrences à fabriquer maintenant, et où placer le curseur ensuite.
 *
 * @param {{debut: string, fin: string|null, prochaine: string,
 *          tous_les: number, unite: string}} rec
 * @param {string} [jour] aujourd'hui, injectable pour les tests
 * @returns {{jours: string[], prochaine: string, termine: boolean}}
 */
export function occurrencesDues(rec, jour = today()) {
  const jours = []
  let curseur = rec.prochaine
  let termine = false

  while (curseur <= jour) {
    // Une récurrence bornée s'arrête d'elle-même : c'est ce qui fait que
    // « tous les jours pendant une semaine » ne dure pas toute la vie.
    if (rec.fin && curseur > rec.fin) { termine = true; break }
    jours.push(curseur)
    if (jours.length >= PLAFOND_RATTRAPAGE) {
      // On saute le retard restant plutôt que de le fabriquer : le
      // curseur repart d'aujourd'hui, la suite reprend normalement.
      curseur = avancer(jour, rec.tous_les, rec.unite, rec.debut)
      return { jours, prochaine: curseur, termine: Boolean(rec.fin && curseur > rec.fin) }
    }
    curseur = avancer(curseur, rec.tous_les, rec.unite, rec.debut)
  }

  if (!termine && rec.fin && curseur > rec.fin) termine = true
  return { jours, prochaine: curseur, termine }
}

/** « Tous les 2 jours », « Toutes les semaines », « Tous les 3 mois ». */
export function libelleRythme(tousLes, unite) {
  const u = UNITES.find((x) => x.id === unite) ?? UNITES[0]
  const n = Math.max(1, Number(tousLes) || 1)
  if (n === 1) {
    if (unite === 'jour') return 'Tous les jours'
    if (unite === 'semaine') return 'Toutes les semaines'
    return 'Tous les mois'
  }
  if (n === 2 && unite === 'jour') return 'Un jour sur deux'
  const article = unite === 'semaine' ? 'Toutes les' : 'Tous les'
  return `${article} ${n} ${u.pluriel}`
}

/**
 * Une phrase complète, celle qui s'affiche avant de valider.
 *
 * Elle annonce aussi COMBIEN de fois quand il y a une fin : « pendant une
 * semaine » est bien plus parlant une fois traduit en « 7 fois ».
 */
export function resumeRecurrence(rec) {
  const rythme = libelleRythme(rec.tous_les, rec.unite)
  if (!rec.fin) return `${rythme}, sans fin.`

  // On compte sur une copie : le résumé ne doit rien avancer.
  let n = 0
  let curseur = rec.debut
  while (curseur <= rec.fin && n < 400) {
    n++
    curseur = avancer(curseur, rec.tous_les, rec.unite, rec.debut)
  }
  return `${rythme}, jusqu'au ${rec.fin} — ${n} fois.`
}
