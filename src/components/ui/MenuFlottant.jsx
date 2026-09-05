import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEstTelephone } from '../../lib/useEcran'

/**
 * Le menu des boutons « ⋯ », pour les catégories comme pour les tâches.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI UN PORTAIL, ET PAS UN SIMPLE `position: fixed`
 *
 * La version précédente posait le menu en `position: fixed` À L'INTÉRIEUR
 * de la carte, avec des coordonnées calculées à la main. Ça marche tant
 * qu'aucun ancêtre ne porte de `transform`, de `filter` ou de `will-change` :
 * ces propriétés font du parent le bloc conteneur des descendants fixes,
 * et le menu se retrouve alors positionné par rapport à la carte — donc
 * découpé par son `overflow: hidden`, donc invisible. Or la carte porte
 * justement une animation d'ouverture qui manipule `transform`, et les
 * navigateurs ne s'accordent pas sur ce qu'il reste de cette transformation
 * une fois l'animation terminée.
 *
 * `createPortal` place le menu directement sous <body> : plus aucun ancêtre
 * ne peut ni le découper ni déplacer son repère. Le problème ne peut plus
 * se poser, quel que soit le navigateur.
 *
 * Sur téléphone, le menu devient une feuille collée en bas de l'écran :
 * pas de coordonnées à calculer du tout, des cibles tactiles pleine largeur,
 * et le pouce n'a pas à monter chercher un menu de 210 px.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function MenuFlottant({ ancre, titre, onFermer, children }) {
  const surTelephone = useEstTelephone()
  const boite = useRef(null)
  const [pos, setPos] = useState(null)

  // Position ancrée au bouton, sur grand écran seulement, et bornée à la
  // fenêtre : un menu ouvert depuis le bas de l'écran remonte au-dessus du
  // bouton plutôt que de déborder sous le bord.
  useLayoutEffect(() => {
    if (surTelephone) { setPos(null); return }
    const bouton = ancre?.current?.getBoundingClientRect()
    const menu = boite.current?.getBoundingClientRect()
    if (!bouton || !menu) return
    const marge = 8
    const gauche = Math.max(
      marge,
      Math.min(bouton.right - menu.width, window.innerWidth - marge - menu.width)
    )
    const dessous = bouton.bottom + 6
    const haut = dessous + menu.height > window.innerHeight - marge
      ? Math.max(marge, bouton.top - 6 - menu.height)
      : dessous
    setPos({ left: gauche, top: haut })
  }, [surTelephone, ancre])

  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', touche)
    return () => document.removeEventListener('keydown', touche)
  }, [onFermer])

  // Un menu ancré ne suit pas le défilement : on le referme. La feuille du
  // téléphone, elle, est collée au bas de l'écran et n'a aucune raison de
  // se fermer parce qu'on fait défiler la liste derrière.
  useEffect(() => {
    if (surTelephone) return
    const fermer = () => onFermer()
    window.addEventListener('resize', fermer)
    document.addEventListener('scroll', fermer, true)
    return () => {
      window.removeEventListener('resize', fermer)
      document.removeEventListener('scroll', fermer, true)
    }
  }, [surTelephone, onFermer])

  const style = surTelephone
    ? undefined
    // Tant que la mesure n'a pas eu lieu, le menu est rendu hors champ et
    // masqué : sans ça on le verrait sauter du coin de l'écran à sa place.
    : { left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }

  return createPortal(
    <div
      className={`voile-menu${surTelephone ? ' en-feuille' : ''}`}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onFermer() }}
    >
      <div
        ref={boite}
        role="menu"
        className={surTelephone ? 'feuille' : 'menu-flottant'}
        style={style}
      >
        {(titre || surTelephone) && (
          <header className="feuille-tete">
            <h3>{titre}</h3>
            <button type="button" className="feuille-fermer" onClick={onFermer} aria-label="Fermer">
              ✕
            </button>
          </header>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
