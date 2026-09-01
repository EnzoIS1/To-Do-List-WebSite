import { useEffect, useState } from 'react'

/**
 * Ajout rapide d'une tâche. Le champ date est un <input type="date"> :
 * il produit et consomme directement des chaînes 'AAAA-MM-JJ', exactement
 * le format de la colonne due_date. Aucune conversion, aucun fuseau.
 *
 * `sansDate` masque le champ d'échéance (liste de courses).
 * `categories` ajoute un choix de catégorie, pour ranger dès la saisie.
 */
export default function QuickAdd({
  onCreer,
  dateParDefaut = null,
  categoryId = null,
  sansDate = false,
  categories = null,
  placeholder = 'Ajouter une tâche…',
}) {
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(dateParDefaut ?? '')
  const [categorie, setCategorie] = useState(categoryId ?? '')

  /**
   * ⚠️ Sans cet effet, le champ date reste bloqué sur la valeur du tout premier
   * rendu. `useState(dateParDefaut)` ne lit son argument qu'au montage du
   * composant : les rendus suivants l'ignorent complètement. Dans le calendrier,
   * cliquer sur un autre jour ne changeait donc rien.
   */
  useEffect(() => {
    setDate(dateParDefaut ?? '')
  }, [dateParDefaut])

  async function envoyer(e) {
    e.preventDefault()
    const propre = titre.trim()
    if (!propre) return
    await onCreer({
      title: propre,
      due_date: sansDate ? null : (date || null),
      category_id: categories ? (categorie || null) : categoryId,
    })
    setTitre('')
  }

  return (
    <form className="ajout-rapide" onSubmit={envoyer}>
      <input
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder={placeholder}
        aria-label="Titre de la tâche"
      />

      {categories && (
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          aria-label="Catégorie"
        >
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.chemin ?? c.name}</option>
          ))}
        </select>
      )}

      {!sansDate && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Échéance"
        />
      )}

      <button type="submit" aria-label="Ajouter">+</button>
    </form>
  )
}
