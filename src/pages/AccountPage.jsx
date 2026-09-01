import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

/**
 * Tout ce qui concerne le compte est ici, et plus dans les paramètres :
 * l'identité connectée et la déconnexion.
 */
export default function AccountPage() {
  const { user, signOut } = useAuth()

  const inscritLe = user?.created_at
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(user.created_at))
    : null

  return (
    <main className="page-reglages">
      <header className="entete-page">
        <div>
          <h1>Compte</h1>
          <p className="sous-titre">Ton identité sur le site</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      <section>
        <h2>Identifiants</h2>
        <dl className="fiche">
          <div>
            <dt>Adresse e-mail</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
          {user?.user_metadata?.display_name && (
            <div>
              <dt>Nom affiché</dt>
              <dd>{user.user_metadata.display_name}</dd>
            </div>
          )}
          {inscritLe && (
            <div>
              <dt>Compte créé le</dt>
              <dd>{inscritLe}</dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2>Session</h2>
        <p className="aide">
          Tes tâches restent enregistrées : la déconnexion ne supprime rien.
        </p>
        <button className="bouton-doux" onClick={signOut}>Se déconnecter</button>
      </section>
    </main>
  )
}
