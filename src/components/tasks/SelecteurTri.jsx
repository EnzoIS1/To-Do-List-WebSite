import { useDonnees } from '../../data/DonneesProvider'
import SelecteurListe from '../ui/SelecteurListe'
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
    <div className="selecteur-tri">
      <SelecteurListe
        etiquette="Ordre des tâches"
        valeur={triTaches}
        options={TRIS.map((t) => ({ id: t.id, nom: t.nom }))}
        onChoisir={setTriTaches}
      />
    </div>
  )
}
