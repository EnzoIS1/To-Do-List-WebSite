import { useDonnees } from '../../data/DonneesProvider'
import { TRIS } from '../../lib/tri'

/**
 * Le choix de l'ordre des tâches.
 *
 * Un seul réglage pour toute l'application, et non un par liste : avoir les
 * catégories triées par date et la journée triée alphabétiquement ne rend
 * service à personne, et c'est un réglage de plus à retrouver. Il est posé
 * dans les catégories, là où les listes sont les plus longues.
 *
 * Il vit dans le navigateur (localStorage) et non en base : c'est une
 * préférence d'affichage, pas une donnée, et le serveur n'en a jamais besoin.
 */
export default function SelecteurTri() {
  const { triTaches, setTriTaches } = useDonnees()

  return (
    <label className="selecteur-tri" title="Ordre des tâches">
      <span className="sr-seulement">Ordre des tâches</span>
      <select value={triTaches} onChange={(e) => setTriTaches(e.target.value)}>
        {TRIS.map((t) => (
          <option key={t.id} value={t.id}>{t.nom}</option>
        ))}
      </select>
    </label>
  )
}
