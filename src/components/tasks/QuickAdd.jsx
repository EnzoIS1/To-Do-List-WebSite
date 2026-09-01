import { useState } from 'react'

/**
 * Ajout rapide d'une tâche. Le champ date est un <input type="date"> :
 * il produit et consomme directement des chaînes 'AAAA-MM-JJ', exactement
 * le format de la colonne due_date. Aucune conversion, aucun fuseau.
 */
export default function QuickAdd({ onCreer, dateParDefaut = null, categoryId = null }) {
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(dateParDefaut ?? '')

  async function envoyer(e) {
    e.preventDefault()
    const propre = titre.trim()
    if (!propre) return
    await onCreer({
      title: propre,
      due_date: date || null,
      category_id: categoryId,
    })
    setTitre('')
  }

  return (
    <form className="ajout-rapide" onSubmit={envoyer}>
      <input
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Ajouter une tâche…"
        aria-label="Titre de la tâche"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Échéance"
      />
      <button type="submit">Ajouter</button>
    </form>
  )
}
