import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTasks } from './useTasks'
import { useCategories } from './useCategories'
import { useReminders } from './useReminders'
import { useRecurrences } from './useRecurrences'
import { useProfil } from './useProfil'
import { occurrencesDues } from '../lib/recurrence'
import { moduleActif, defautsDuMetier } from '../lib/metiers'
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
  const recurrences = useRecurrences()
  const { profil, modifier: modifierProfil } = useProfil()

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

  /*
   * ══ LA FABRICATION DES OCCURRENCES DUES ══
   *
   * Une fois par chargement, au moment où les règles arrivent. Pas à
   * chaque rendu, pas sur une minuterie : les récurrences se comptent en
   * jours, une vérification à l'ouverture suffit largement.
   *
   * L'ORDRE DES DEUX ÉCRITURES EST LE POINT DÉLICAT. On crée les tâches
   * d'abord, on avance le curseur ensuite. Si le réseau tombe entre les
   * deux, on aura au pire un doublon à la prochaine ouverture — visible,
   * et supprimable d'un clic. Dans l'autre ordre, on aurait des
   * occurrences définitivement perdues, sans que rien ne le signale.
   * Entre un doublon qu'on voit et un oubli qu'on ne voit pas, le doublon
   * est le bon choix.
   *
   * `fabricationFaite` protège du double passage en mode strict de React,
   * qui monte les effets deux fois en développement : sans ce garde-fou,
   * chaque ouverture en local créerait tout en double.
   */
  const {
    recurrences: reglesRecurrentes, recurrencesLoading, avancerCurseur,
  } = recurrences
  const fabricationFaite = useRef(false)

  useEffect(() => {
    if (recurrencesLoading) { fabricationFaite.current = false; return }
    if (fabricationFaite.current) return
    fabricationFaite.current = true

    const jour = today()
    const aFaire = reglesRecurrentes.filter((r) => r.actif && r.prochaine <= jour)
    if (aFaire.length === 0) return

    let annule = false
    ;(async () => {
      for (const regle of aFaire) {
        if (annule) return
        const { jours, prochaine, termine } = occurrencesDues(regle, jour)
        if (jours.length === 0) continue
        const { error } = await creerPlusieurs(jours.map((j) => ({
          title: regle.title,
          quantity: regle.quantity,
          category_id: regle.category_id,
          // Sans échéance, pas de rappel automatique de la veille : c'est
          // ce qui évite qu'une liste de courses notifie toutes les semaines.
          due_date: regle.avec_echeance ? j : null,
          recurrence_id: regle.id,
        })))
        // En cas d'échec, on laisse le curseur où il est : la prochaine
        // ouverture réessaiera au lieu de sauter l'occurrence.
        if (error) continue
        await avancerCurseur(regle.id, prochaine, termine)
      }
      if (!annule) await rechargerRappels()
    })()

    return () => { annule = true }
  }, [
    recurrencesLoading, reglesRecurrentes,
    creerPlusieurs, avancerCurseur, rechargerRappels,
  ])

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

  /** Les rappels à annoncer, rangés par jour : pas vus, tâche vivante et à faire. */
  const rappelsVivants = useMemo(() => {
    const parJour = new Map()
    for (const r of rappels.rappels) {
      if (r.seen_at) continue
      const tache = tasks.find((t) => t.id === r.task_id)
      if (!tache || tache.is_done) continue
      if (!parJour.has(r.remind_on)) parJour.set(r.remind_on, [])
      parJour.get(r.remind_on).push({ rappel: r, tache })
    }
    return parJour
  }, [rappels.rappels, tasks])

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
      ...recurrences,

      /*
       * ══ LE PROFIL, LE MÉTIER ET LES MODULES ══
       *
       * Le profil est chargé ICI et nulle part ailleurs. Il l'était aussi
       * dans la section Notifications, par un second appel à useProfil :
       * deux copies du même profil, donc deux états qui divergent. Changer
       * de métier dans les réglages n'aurait pas mis à jour l'affichage du
       * reste de l'application avant un rechargement complet de la page.
       */
      profil,
      modifierProfil,
      metier: profil?.metier ?? null,
      modules: profil?.modules ?? {},
      /** Le seul test à utiliser dans les composants. Défaut : allumé. */
      moduleActif: (id) => moduleActif(profil?.modules, id),
      /**
       * Choisir un métier applique ses défauts. C'est une remise à zéro
       * assumée des modules — d'où la confirmation côté réglages : sans
       * elle, on perdrait sans prévenir les modules réglés à la main.
       */
      choisirMetier: (id) => modifierProfil({ metier: id, modules: defautsDuMetier(id) }),
      basculerModule: (id, actif) => modifierProfil({
        modules: { ...(profil?.modules ?? {}), [id]: actif },
      }),
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
      /*
       * Les rappels VIVANTS, rangés par jour — pour le calendrier.
       *
       * Deux corrections d'un coup ici :
       *
       * 1. Le filtre. On ne gardait que « pas encore écarté », sans regarder
       *    la tâche. Résultat : cocher une tâche vidait bien le rappel de la
       *    page Rappels — qui, elle, filtrait sur `is_done` — mais la
       *    clochette restait dans le calendrier, pour un rappel qui n'avait
       *    plus rien à annoncer. Deux endroits, deux règles : c'est toujours
       *    comme ça que naissent ces écarts. La règle est maintenant ici,
       *    une seule fois.
       *
       * 2. Le contenu. C'était un Set de dates : le calendrier savait qu'il
       *    y avait un rappel, jamais lequel. Une Map jour → rappels permet
       *    d'afficher DE QUELLE TÂCHE il s'agit, ce qui est la seule chose
       *    qu'on veut vraiment savoir en regardant une clochette.
       */
      rappelsParJour: rappelsVivants,
      joursAvecRappel: new Set(rappelsVivants.keys()),
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
    taches, categories, rappels, recurrences, profil, modifierProfil,
    delaiArchivage, setDelaiArchivage,
    triTaches, setTriTaches, suivi,
    cocherEtReplanifier, revisionsDe, activerRevision, desactiverRevision, tasks,
    rappelsVivants,
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
