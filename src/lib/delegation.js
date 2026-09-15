import { addDays, daysBetween, today } from './dates.js'

/**
 * Le suivi de délégation : ce qu'on attend de quelqu'un.
 *
 * ─────────────────────────────────────────────────────────────────────
 * UNE MÉCANIQUE, QUATRE NOMS
 *
 * « En attente de » pour un salarié, « ce qui bloque » pour un manager,
 * « délégué à » pour un chef d'équipe, « relance client » pour un
 * indépendant : c'est la même chose. Une tâche confiée à quelqu'un, une
 * date de départ, et une relance au bout d'un certain temps.
 *
 * Écrire les quatre séparément aurait donné quatre écrans à maintenir
 * pour un seul comportement — la même erreur que si on avait séparé la
 * liste de courses des tâches répétées.
 *
 * POURQUOI COMPTER LES JOURS PLUTÔT QU'AFFICHER UNE DATE
 *
 * « Depuis le 3 septembre » demande de faire la soustraction ; « depuis
 * 12 jours » dit immédiatement si c'est normal ou si ça traîne. C'est
 * la seule information qu'on cherche en regardant cette liste.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Les délais d'un clic. Sept jours est le défaut : une semaine, un cycle. */
export const DELAIS_RELANCE = [
  { jours: 3, nom: '3 jours' },
  { jours: 7, nom: '1 semaine' },
  { jours: 14, nom: '2 semaines' },
  { jours: 30, nom: '1 mois' },
]

export const DELAI_RELANCE_DEFAUT = 7

/** Une tâche est-elle en attente de quelqu'un ? */
export const estEnAttente = (t) => Boolean(t.attente_de) && !t.is_done

/** Depuis combien de jours. 0 = aujourd'hui, jamais négatif à l'affichage. */
export function joursDAttente(tache, jour = today()) {
  if (!tache.attente_depuis) return 0
  return Math.max(0, daysBetween(tache.attente_depuis, jour))
}

/** Le jour où la relance est prévue, ou null s'il n'y en a pas. */
export function jourDeRelance(tache) {
  if (!tache.attente_depuis || !tache.relance_apres) return null
  return addDays(tache.attente_depuis, tache.relance_apres)
}

/**
 * Où en est l'attente.
 *
 *   'calme'      — on attend, c'est normal, rien à faire
 *   'a-relancer' — le délai est atteint aujourd'hui
 *   'depasse'    — le délai est dépassé
 *   'sans-delai' — on attend, mais aucune relance n'a été demandée
 */
export function etatAttente(tache, jour = today()) {
  const relance = jourDeRelance(tache)
  if (!relance) return 'sans-delai'
  if (relance > jour) return 'calme'
  if (relance === jour) return 'a-relancer'
  return 'depasse'
}

/** « depuis 12 jours », « depuis hier », « depuis aujourd'hui ». */
export function libelleAttente(tache, jour = today()) {
  const n = joursDAttente(tache, jour)
  if (n === 0) return "depuis aujourd'hui"
  if (n === 1) return 'depuis hier'
  return `depuis ${n} jours`
}

/**
 * Les attentes groupées par personne.
 *
 * Le tri est double, et c'est ce qui rend la liste utile : les personnes
 * sont classées par l'attente LA PLUS ANCIENNE qu'on a avec elles — donc
 * celle qui bloque le plus remonte en tête — et à l'intérieur, les tâches
 * de la plus ancienne à la plus récente.
 *
 * Le regroupement est insensible à la casse et aux espaces : « la compta »
 * et « La compta » sont la même personne. Le nom affiché est celui de la
 * saisie la plus ancienne, pour ne pas changer sous les yeux.
 */
export function grouperParPersonne(taches, jour = today()) {
  const parCle = new Map()

  for (const t of taches) {
    if (!estEnAttente(t)) continue
    const cle = t.attente_de.trim().toLowerCase()
    if (!parCle.has(cle)) parCle.set(cle, { personne: t.attente_de.trim(), taches: [] })
    parCle.get(cle).taches.push(t)
  }

  return [...parCle.values()]
    .map((g) => {
      const taches = g.taches.sort(
        (a, b) => (a.attente_depuis ?? '').localeCompare(b.attente_depuis ?? '')
      )
      return {
        ...g,
        personne: taches[0].attente_de.trim(),
        taches,
        joursMax: joursDAttente(taches[0], jour),
        aRelancer: taches.some((t) => ['a-relancer', 'depasse'].includes(etatAttente(t, jour))),
      }
    })
    .sort((a, b) => b.joursMax - a.joursMax || a.personne.localeCompare(b.personne, 'fr'))
}

/** Combien de tâches en attente au total. */
export const compterAttentes = (groupes) =>
  groupes.reduce((n, g) => n + g.taches.length, 0)
