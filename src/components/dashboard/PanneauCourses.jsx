import ShoppingPanel from './ShoppingPanel'
import { useDonnees } from '../../data/DonneesProvider'

/**
 * La liste de courses, autonome.
 *
 * ShoppingPanel reçoit sept propriétés, toutes disponibles dans le
 * provider. Ce mince emballage les lui fournit — c'est ce qui permet de
 * l'afficher AUSSI en page dédiée, où il n'y a aucun parent pour les
 * passer. Sans lui, « page dédiée » serait une option qui ne ferait rien
 * pour cette fonctionnalité, ce qui est pire que de ne pas l'offrir.
 */
export default function PanneauCourses() {
  const {
    categorieCourses, tasks, loading, creer, cocher, supprimer, creerCategorie,
  } = useDonnees()

  return (
    <ShoppingPanel
      categorie={categorieCourses} taches={tasks} loading={loading}
      creer={creer} cocher={cocher} supprimer={supprimer}
      onCreerCategorie={() => creerCategorie({ name: 'Courses', color: '#9C5227' })}
    />
  )
}
