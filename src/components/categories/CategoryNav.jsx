import { NavLink } from 'react-router-dom'
import { useCategories } from '../../data/useCategories'

export default function CategoryNav() {
  const { arbre, loading } = useCategories()

  if (loading) return <p className="etat">Chargement…</p>
  if (arbre.length === 0) {
    return <p className="etat">Aucune catégorie. Exécute <code>supabase/seed.sql</code> pour créer les catégories de départ.</p>
  }

  return (
    <ul className="nav-categories">
      {arbre.map((racine) => (
        <li key={racine.id}>
          <NavLink to={`/categorie/${racine.id}`}>
            <span className="pastille" style={{ background: racine.color }} />
            {racine.name}
          </NavLink>
          {racine.enfants.length > 0 && (
            <ul>
              {racine.enfants.map((enfant) => (
                <li key={enfant.id}>
                  <NavLink to={`/categorie/${enfant.id}`}>{enfant.name}</NavLink>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
