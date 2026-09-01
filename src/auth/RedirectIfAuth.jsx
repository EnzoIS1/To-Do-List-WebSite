import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

/**
 * L'inverse de RequireAuth : empêche un utilisateur déjà connecté de rester
 * sur l'écran de connexion.
 *
 * C'est ce composant qui manquait. Sans lui, la connexion réussissait — la
 * session était bien créée — mais la route restait sur /connexion, qui
 * réaffichait le formulaire indéfiniment. Rien ne semblait se passer, alors
 * que tout avait fonctionné.
 *
 * Il renvoie vers la page que l'utilisateur cherchait à atteindre avant d'être
 * redirigé ici, ou vers l'accueil à défaut.
 */
export default function RedirectIfAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="etat">Chargement…</p>
  if (session) return <Navigate to={location.state?.depuis ?? '/'} replace />
  return children
}
