import InboxPanel from './InboxPanel'
import { useDonnees } from '../../data/DonneesProvider'

/** La prise de notes, autonome — même raison que PanneauCourses. */
export default function PanneauNotes() {
  const { tasks, loading, cocher, modifier, creer } = useDonnees()

  return (
    <InboxPanel
      taches={tasks} loading={loading} cocher={cocher}
      ranger={modifier} creer={creer}
    />
  )
}
