import { useEffect, useRef, useState } from 'react'
import { today } from '../../lib/dates'
import { useEstTelephone } from '../../lib/useEcran'
import Icone from '../layout/Icones'

/**
 * La barre de saisie unique.
 *
 * C'était le premier défaut relevé pendant la revue : il y avait cinq champs
 * d'ajout différents, donc il fallait choisir *où* ranger avant de savoir
 * *quoi* écrire. Ici on écrit d'abord ; la date et la catégorie sont deux
 * boutons facultatifs à côté, pré-remplis avec le contexte de l'écran.
 */
export default function BarreCapture({
  onCreer, categories = [], dateParDefaut = null, categorieParDefaut = null,
  placeholder = 'Ajouter une tâche…', compacte = false, pile = false, autoFocus = false,
}) {
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(dateParDefaut ?? '')
  const [categorie, setCategorie] = useState(categorieParDefaut ?? '')
  const [deplie, setDeplie] = useState(false)
  const champ = useRef(null)
  const telephone = useEstTelephone()

  /**
   * Sur 390 px de large, le titre, la date et la catégorie côte à côte ne
   * laissent que quelques caractères visibles au champ principal. Les deux
   * réglages passent donc sur une seconde ligne, qui n'apparaît qu'une fois
   * qu'on écrit. Sur grand écran il y a la place : tout reste visible.
   */
  const optionsVisibles = pile || !telephone || deplie || titre.length > 0

  /*
   * Dans la fenêtre du bouton « + », le champ est la seule raison d'avoir
   * ouvert la fenêtre : on y met le curseur tout de suite.
   *
   * Le `requestAnimationFrame` n'est pas une superstition : <MenuFlottant>
   * mesure la fenêtre dans un effet de mise en page pour la positionner, et
   * ce calcul s'exécute APRÈS celui-ci. Sans l'attente d'une image, le focus
   * est posé puis perdu au repositionnement.
   */
  useEffect(() => {
    if (!autoFocus) return
    const t = requestAnimationFrame(() => champ.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [autoFocus])

  // Le contexte de l'écran change (autre jour choisi, autre onglet) : on suit.
  useEffect(() => { setDate(dateParDefaut ?? '') }, [dateParDefaut])
  useEffect(() => { setCategorie(categorieParDefaut ?? '') }, [categorieParDefaut])

  async function envoyer(e) {
    e.preventDefault()
    const propre = titre.trim()
    if (!propre) return
    await onCreer({
      title: propre,
      due_date: date || null,
      category_id: categorie || null,
    })
    setTitre('')
    setDeplie(false)
    champ.current?.focus()
  }

  return (
    <form
      className={`barre-capture${telephone || pile ? ' empilee' : ''}${compacte ? ' compacte' : ''}${pile ? ' en-fenetre' : ''}`}
      onSubmit={envoyer}
    >
      <div className="capture-ligne">
        <input
          ref={champ}
          className="capture-titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onFocus={() => setDeplie(true)}
          placeholder={placeholder}
          aria-label="Nouvelle tâche"
        />
        {(telephone || pile) && (
          <button type="submit" className="capture-valider" aria-label="Ajouter la tâche">
            <Icone nom="plus" taille={18} />
          </button>
        )}
      </div>

      <div className="capture-options" hidden={!optionsVisibles}>
        <input
          type="date"
          className="capture-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Échéance"
        />
        {categories.length > 0 && (
          <select
            className="capture-categorie"
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
        {!telephone && !pile && (
          <button type="submit" className="capture-valider" aria-label="Ajouter la tâche">
            <Icone nom="plus" taille={18} />
          </button>
        )}
      </div>
    </form>
  )
}

/** Le jour du jour, exporté ici pour éviter un import de plus côté appelant. */
export { today }
