import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

/**
 * L'inverse de RequireAuth : empêche un utilisateur déjà connecté de rester
 * sur l'écran de connexion.
 *
 * Une connexion réussie mène toujours au tableau de bord, jamais à la page
 * d'où l'on venait : après s'être déconnecté depuis les paramètres, on veut
 * retrouver son tableau de bord, pas le formulaire de réglages.
 */
export default function RedirectIfAuth({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="etat">Chargement…</p>
  if (session) return <Navigate to="/" replace />
  return children
}
