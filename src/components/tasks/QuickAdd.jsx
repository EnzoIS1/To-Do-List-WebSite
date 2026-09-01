import { useEffect, useState } from 'react'

/**
 * Ajout rapide d'une tâche. Le champ date est un <input type="date"> :
 * il produit et consomme directement des chaînes 'AAAA-MM-JJ', exactement
 * le format de la colonne due_date. Aucune conversion, aucun fuseau.
 */
export default function QuickAdd({ onCreer, dateParDefaut = null, categoryId = null }) {
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(dateParDefaut ?? '')

  /**
   * ⚠️ Sans cet effet, le champ date reste bloqué sur la valeur du tout premier
   * rendu. `useState(dateParDefaut)` ne lit son argument qu'au montage du
   * composant : les rendus suivants l'ignorent complètement. Dans le calendrier,
   * le composant se monte avec la date du jour, et cliquer sur un autre jour ne
   * changeait donc rien — toutes les tâches partaient à la date d'aujourd'hui.
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
