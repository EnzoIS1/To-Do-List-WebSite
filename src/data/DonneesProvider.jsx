import { createContext, useContext, useMemo } from 'react'
import { useTasks } from './useTasks'
import { useCategories } from './useCategories'
import { useReglage, joursDArchivage } from '../lib/useReglage'

const DonneesContext = createContext(null)

/** La catégorie « Courses » est reconnue par son nom, sans colonne dédiée. */
export const estCategorieCourses = (c) => c.name.trim().toLowerCase().startsWith('course')

/**
 * Charge les tâches et les catégories UNE fois pour toute l'application.
 *
 * Avant, chaque panneau appelait useTasks de son côté ; avec le téléphone et
 * ses trois onglets, ça voulait dire tout recharger à chaque changement
 * d'onglet. Ici tout le monde lit la même liste et filtre ce qui le concerne.
 */
export function DonneesProvider({ children }) {
  const [delaiArchivage, setDelaiArchivage] = useReglage('todo-archivage', 'mois')
  const taches = useTasks({
    includeDone: true,
    archiveApresJours: joursDArchivage(delaiArchivage),
  })
  const categories = useCategories()

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
    }
  }, [taches, categories, delaiArchivage, setDelaiArchivage])

  return <DonneesContext.Provider value={value}>{children}</DonneesContext.Provider>
}

export function useDonnees() {
  const ctx = useContext(DonneesContext)
  if (!ctx) throw new Error('useDonnees() doit être appelé dans un <DonneesProvider>')
  return ctx
}
