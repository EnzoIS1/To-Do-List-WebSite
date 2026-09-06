import { createContext, useCallback, useContext, useMemo } from 'react'
import { useTasks } from './useTasks'
import { useCategories } from './useCategories'
import { useReminders } from './useReminders'
import { useReglage, joursDArchivage } from '../lib/useReglage'
import {
  planifierRevisions, replanifierRevisions, planComplet, bornesDuPlan,
} from '../lib/revision'
import { daysBetween, today } from '../lib/dates'
import { TRI_DEFAUT } from '../lib/tri'

const DonneesContext = createContext(null)

/** La catégorie « Courses » est reconnue par son nom, sans colonne dédiée. */
export const estCategorieCourses = (c) => c.name.trim().toLowerCase().startsWith('course')

/** Le titre donné aux tâches engendrées par le système de révision. */
export const titreDeRevision = (titre) => `Réviser : ${titre}`

/**
 * Charge les tâches, les catégories et les rappels UNE fois pour toute
 * l'application.
 *
 * Avant, chaque panneau appelait useTasks de son côté ; avec le téléphone et
 * ses trois onglets, ça voulait dire tout recharger à chaque changement
 * d'onglet. Ici tout le monde lit la même liste et filtre ce qui le concerne.
 */
export function DonneesProvider({ children }) {
  const [delaiArchivage, setDelaiArchivage] = useReglage('todo-archivage', 'mois')
  const [triTaches, setTriTaches] = useReglage('todo-tri', TRI_DEFAUT)
  const taches = useTasks({
    includeDone: true,
    archiveApresJours: joursDArchivage(delaiArchivage),
  })
  const categories = useCategories()
  const rappels = useReminders()

  const { tasks, creerPlusieurs, modifier, supprimerPlusieurs, cocher } = taches
  const { rechargerRappels } = rappels

  /**
   * Toute écriture sur une tâche est suivie d'une relecture des rappels.
   *
   * Depuis la migration 0006, c'est un trigger PostgreSQL qui crée et
   * déplace le rappel automatique — donc la base change SANS que le site
   * l'ait demandé. Sans cette relecture, le calendrier et la page Rappels
   * continueraient d'afficher l'état d'avant jusqu'au prochain rechargement
   * complet de la page.
   */
  const suivi = useCallback((fn) => async (...args) => {
    const resultat = await fn(...args)
    await rechargerRappels()
    return resultat
  }, [rechargerRappels])

  /** Les tâches de révision engendrées par une tâche source, par date. */
  const revisionsDe = useCallback(
    (id) => tasks
      .filter((t) => t.revision_of === id)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [tasks]
  )

  /**
   * Active — ou reprogramme — les révisions d'une tâche.
   *
   * Les séances déjà cochées sont conservées : elles font partie de
   * l'historique, et les effacer donnerait l'impression que le travail
   * fait n'a pas compté. Seules les séances à venir sont remplacées.
   */
  const activerRevision = useCallback(async (tache, plan = null) => {
    /*
     * Deux dates, et aucune à saisir.
     *
     * Le départ est TOUJOURS aujourd'hui : on active la révision au moment
     * où on décide de réviser. Partir de l'échéance ne créerait rien avant
     * trois semaines pour un devoir prévu dans trois semaines.
     *
     * L'arrivée est l'échéance de la tâche elle-même. Il y avait avant un
     * champ « date de l'examen » à remplir en plus — mais une tâche
     * « Contrôle de maths » datée du 20 porte déjà la réponse. Un champ de
     * moins à remplir, et une date de moins à maintenir en accord.
     */
    if (!tache.due_date) {
      return { error: { message: 'Donne d\'abord une date à la tâche : c\'est elle qui sert d\'échéance aux révisions.' } }
    }
    /*
     * Le rythme vient du panneau, ou du plan déjà enregistré sur la tâche
     * si on rallume sans rien changer. `planComplet` bouche les trous :
     * une tâche d'avant la migration 0008 n'a pas de plan du tout, et doit
     * continuer à se comporter comme avant.
     */
    const planChoisi = planComplet(plan ?? tache.revision_plan)
    // « Du … au … » : aujourd'hui et l'échéance de la tâche tant que
    // l'utilisateur n'a rien figé dans le panneau.
    const { depart, fin } = bornesDuPlan(planChoisi, tache.due_date, today())
    const jours = planifierRevisions(depart, fin, planChoisi)
    if (jours.length === 0) {
      return { error: { message: "L'échéance est trop proche pour étaler des révisions." } }
    }

    const aRemplacer = revisionsDe(tache.id).filter((t) => !t.is_done)
    if (aRemplacer.length) await supprimerPlusieurs(aRemplacer.map((t) => t.id))

    const dejaFaites = revisionsDe(tache.id).filter((t) => t.is_done).length
    const { error } = await creerPlusieurs(
      jours.map((jour, i) => ({
        title: titreDeRevision(tache.title),
        due_date: jour,
        category_id: tache.category_id,
        revision_of: tache.id,
        revision_index: dejaFaites + i + 1,
      }))
    )
    if (error) return { error }
    // On garde trace de l'échéance visée au moment de l'activation, et du
    // rythme choisi : sans lui, la replanification d'une séance faite en
    // retard retomberait sur le mode espacé et défferait le réglage.
    return modifier(tache.id, { exam_date: tache.due_date, revision_plan: planChoisi })
  }, [revisionsDe, supprimerPlusieurs, creerPlusieurs, modifier])

  /** Coupe les révisions : les séances à venir disparaissent, pas les faites. */
  const desactiverRevision = useCallback(async (tache) => {
    const aVenir = revisionsDe(tache.id).filter((t) => !t.is_done)
    if (aVenir.length) await supprimerPlusieurs(aVenir.map((t) => t.id))
    return modifier(tache.id, { exam_date: null })
  }, [revisionsDe, supprimerPlusieurs, modifier])

  /**
   * Cocher, avec un cas particulier : une séance de révision validée EN
   * RETARD décale tout le plan. Si on ne fait rien, les séances suivantes
   * restent collées à leurs dates d'origine et peuvent tomber le lendemain,
   * ce qui annule l'espacement — c'est-à-dire tout l'intérêt du système.
   * On redistribue donc les séances restantes sur le temps qui reste.
   */
  const cocherEtReplanifier = useCallback(async (tache) => {
    const resultat = await cocher(tache)
    if (tache.is_done || !tache.revision_of || !tache.due_date) return resultat
    if (daysBetween(tache.due_date, today()) <= 0) return resultat   // à l'heure

    const source = tasks.find((t) => t.id === tache.revision_of)
    // L'échéance de la tâche fait foi ; `exam_date` n'est qu'une trace de ce
    // qui était visé à l'activation, et sert de repli.
    const echeance = source?.due_date ?? source?.exam_date
    if (!echeance) return resultat

    const restantes = revisionsDe(source.id)
      .filter((t) => !t.is_done && t.id !== tache.id)
    if (restantes.length === 0) return resultat

    // On repart d'aujourd'hui — c'est le retard qu'on rattrape — mais on
    // s'arrête à la fin choisie dans le panneau si elle a été figée.
    const { fin } = bornesDuPlan(source.revision_plan, echeance, today())
    const jours = replanifierRevisions(today(), fin, source.revision_plan, restantes.length)

    // Moins de jours disponibles que de séances : on supprime les séances
    // en trop plutôt que d'en empiler deux le même jour.
    const surplus = restantes.slice(0, Math.max(0, restantes.length - jours.length))
    if (surplus.length) await supprimerPlusieurs(surplus.map((t) => t.id))

    const gardees = restantes.slice(surplus.length)
    for (let i = 0; i < gardees.length; i++) {
      if (gardees[i].due_date !== jours[i]) await modifier(gardees[i].id, { due_date: jours[i] })
    }
    return resultat
  }, [cocher, tasks, revisionsDe, supprimerPlusieurs, modifier])

  const value = useMemo(() => {
    const { categories: plates, arbre } = categories

    /** Liste à plat pour les menus, avec le chemin : « Études › Maths ». */
    const choix = arbre.flatMap((racine) => [
      { id: racine.id, name: racine.name, chemin: racine.name },
      ...racine.enfants.map((e) => ({
        id: e.id, name: e.name, chemin: `${racine.name} › ${e.name}`,
      })),
    ])

    return {
      ...taches,
      // Les écritures passent par `suivi` : le trigger de la base crée et
      // déplace les rappels automatiques, il faut donc les relire ensuite.
      creer: suivi(taches.creer),
      creerPlusieurs: suivi(taches.creerPlusieurs),
      modifier: suivi(taches.modifier),
      supprimer: suivi(taches.supprimer),
      supprimerPlusieurs: suivi(taches.supprimerPlusieurs),
      cocher: suivi(cocherEtReplanifier),
      categories: plates,
      arbre,
      choixCategories: choix,
      categorieCourses: plates.find(estCategorieCourses) ?? null,
      arbreSansCourses: arbre.filter((c) => !estCategorieCourses(c)),
      creerCategorie: categories.creer,
      modifierCategorie: categories.modifier,
      supprimerCategorie: categories.supprimer,
      couleurDe: (tache) =>
        plates.find((c) => c.id === tache.category_id)?.color ?? 'var(--discret)',
      nomCategorieDe: (tache) =>
        plates.find((c) => c.id === tache.category_id)?.name ?? null,
      delaiArchivage,
      setDelaiArchivage,
      triTaches,
      setTriTaches,
      ...rappels,
      /*
       * Le rappel automatique se refuse sur la TÂCHE, pas en effaçant la
       * ligne du rappel.
       *
       * Supprimer le rappel seul ne tenait pas : le trigger de la base le
       * repose à chaque écriture sur la date ou sur `is_done` — cocher puis
       * décocher suffisait à le voir revenir. La colonne `rappel_auto`
       * (migration 0007) porte le refus, et le trigger la lit avant de
       * reposer quoi que ce soit.
       */
      basculerRappelAuto: (tache, actif) =>
        suivi(taches.modifier)(tache.id, { rappel_auto: actif }),
      revisionsDe,
      activerRevision,
      /** Le rythme enregistré sur une tâche, complété par les défauts. */
      planDeRevision: (tache) => planComplet(tache?.revision_plan),
      desactiverRevision,
      /** Vrai si la tâche a un plan de révision en cours ou déjà entamé. */
      revisionActive: (tache) => tasks.some((t) => t.revision_of === tache.id),
      /** Les jours qui portent au moins un rappel non vu — pour le calendrier. */
      joursAvecRappel: new Set(
        rappels.rappels.filter((r) => !r.seen_at).map((r) => r.remind_on)
      ),
      /** Le libellé « révision 2/4 » d'une séance, ou null si ce n'en est pas une. */
      rangDeRevision: (tache) => {
        if (!tache.revision_of) return null
        const fratrie = tasks.filter((t) => t.revision_of === tache.revision_of)
        const rang = fratrie
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
          .findIndex((t) => t.id === tache.id) + 1
        return `révision ${rang}/${fratrie.length}`
      },
    }
  }, [
    taches, categories, rappels, delaiArchivage, setDelaiArchivage,
    triTaches, setTriTaches, suivi,
    cocherEtReplanifier, revisionsDe, activerRevision, desactiverRevision, tasks,
  ])

  return <DonneesContext.Provider value={value}>{children}</DonneesContext.Provider>
}

export function useDonnees() {
  const ctx = useContext(DonneesContext)
  if (!ctx) throw new Error('useDonnees() doit être appelé dans un <DonneesProvider>')
  return ctx
}

/*
 * Le vocabulaire des rappels vit maintenant dans lib/rappels.js, avec les
 * libellés qui vont avec. Il est réexporté ici parce que les composants
 * l'importaient d'ici, et parce qu'un fichier de données ne devrait pas
 * être la source d'une constante de présentation.
 */
export { DECALAGES_RAPPEL, jourDuRappel, libelleRappel, detailRappel } from '../lib/rappels'
