import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

/**
 * Enveloppe les pages privées. Ce garde-fou est un confort d'interface,
 * PAS une sécurité : la vraie protection est la RLS, côté base de données.
 * Même en contournant ce composant, on ne peut rien lire qui ne soit à soi.
 */
export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="etat">Chargement…</p>
  if (!session) return <Navigate to="/connexion" replace />
  return children
}
