import { useEffect, useRef, useState } from 'react'
import MenuFlottant from './MenuFlottant'
import { useEstTelephone } from '../../lib/useEcran'

/**
 * Une liste déroulante dessinée par le site.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI REMPLACER UN <select> QUI MARCHE
 *
 * Parce que la liste qui s'ouvre n'appartient pas à la page. Le champ
 * fermé se met au style qu'on veut, mais le menu déroulé est dessiné par
 * le système : fond blanc, surlignage bleu, coins carrés. Sur un thème
 * sombre en verre dépoli, ça saute aux yeux — et aucune règle CSS ne
 * peut y toucher, c'est une limite du navigateur, pas un oubli.
 *
 * Ce composant redessine donc le menu, en réutilisant <MenuFlottant> :
 * même portail, même voile, même feuille en bas d'écran sur téléphone,
 * donc le même comportement que les menus « ⋯ » déjà en place.
 *
 * CE QU'ON PERD, ET COMMENT C'EST REMPLACÉ
 *
 * Un <select> natif apporte gratuitement le clavier, le lecteur d'écran
 * et, sur téléphone, la roue système. Ici il faut les réécrire :
 * `role="listbox"` et `role="option"` pour l'annonce, les flèches et
 * Origine/Fin pour la navigation, Échap pour fermer (assuré par
 * MenuFlottant), et le focus rendu au bouton à la fermeture — sans quoi
 * on repart au début de la page à chaque choix.
 * ─────────────────────────────────────────────────────────────────────
 *
 * @param {object} props
 * @param {string|null} props.valeur      l'identifiant choisi
 * @param {{id: string|null, nom: string, detail?: string}[]} props.options
 * @param {(id: string|null) => void} props.onChoisir
 * @param {string} props.etiquette        ce que la liste règle, pour l'annonce
 * @param {string} [props.placeholder]    affiché si rien n'est choisi
 */
export default function SelecteurListe({
  valeur, options, onChoisir, etiquette, placeholder = 'Choisir…', className = '',
}) {
  const surTelephone = useEstTelephone()
  const [ouvert, setOuvert] = useState(false)
  const bouton = useRef(null)
  const liste = useRef(null)

  const choisie = options.find((o) => String(o.id ?? '') === String(valeur ?? ''))

  // À l'ouverture, le focus part sur l'option courante : c'est ce que fait
  // un <select> natif, et c'est ce qui permet d'enchaîner aux flèches.
  useEffect(() => {
    if (!ouvert) return
    const t = setTimeout(() => {
      const el = liste.current?.querySelector('[aria-selected="true"]') ??
        liste.current?.querySelector('[role="option"]')
      el?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [ouvert])

  function fermer() {
    setOuvert(false)
    // Sans ça, le focus retombe sur <body> et la tabulation suivante
    // repart du haut de la page.
    bouton.current?.focus()
  }

  function auClavier(e) {
    const items = [...(liste.current?.querySelectorAll('[role="option"]') ?? [])]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const suivant = e.key === 'ArrowDown'
        ? Math.min(items.length - 1, i + 1)
        : Math.max(0, i - 1)
      items[suivant]?.focus()
    }
    if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
  }

  return (
    <>
      <button
        ref={bouton}
        type="button"
        className={`selecteur ${className}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-label={etiquette}
        onClick={() => setOuvert((v) => !v)}
      >
        <span className="selecteur-valeur">{choisie?.nom ?? placeholder}</span>
        <span className="selecteur-fleche" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/*
        Le titre et sa croix n'apparaissent que sur téléphone, où le menu
        devient une feuille en bas d'écran et a besoin d'une poignée pour se
        refermer. Sur ordinateur, un bandeau « Catégorie ✕ » au-dessus de
        quatre lignes pèserait plus lourd que la liste elle-même.
      */}
      {ouvert && (
        <MenuFlottant ancre={bouton} titre={surTelephone ? etiquette : null} onFermer={fermer}>
          <div
            className="liste-options"
            role="listbox"
            aria-label={etiquette}
            ref={liste}
            onKeyDown={auClavier}
          >
            {options.map((o) => {
              const active = String(o.id ?? '') === String(valeur ?? '')
              return (
                <button
                  key={String(o.id ?? 'aucun')}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`option${active ? ' active' : ''}`}
                  onClick={() => { onChoisir(o.id); fermer() }}
                >
                  <span className="option-marque" aria-hidden="true">{active ? '✓' : ''}</span>
                  <span className="option-texte">
                    <span>{o.nom}</span>
                    {o.detail && <em>{o.detail}</em>}
                  </span>
                </button>
              )
            })}
          </div>
        </MenuFlottant>
      )}
    </>
  )
}
