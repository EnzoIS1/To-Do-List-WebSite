import { NavLink } from 'react-router-dom'

/**
 * La barre étroite de gauche du croquis : la marque en haut,
 * Paramètres et Compte en bas.
 */
export default function Rail() {
  return (
    <nav className="rail" aria-label="Navigation principale">
      <NavLink to="/" className="rail-marque" title="Tableau de bord" aria-label="Tableau de bord">
        <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="currentColor" opacity=".14" />
          <path d="M9 16.5l4.8 4.8L23 12" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </NavLink>

      <div className="rail-bas">
        <NavLink to="/reglages" className="rail-lien">
          <span aria-hidden="true">⚙</span>
          <span className="rail-texte">Paramètres</span>
        </NavLink>

        <NavLink to="/compte" className="rail-lien">
          <span aria-hidden="true">☺</span>
          <span className="rail-texte">Compte</span>
        </NavLink>
      </div>
    </nav>
  )
}
