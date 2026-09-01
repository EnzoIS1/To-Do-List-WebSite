import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('connexion')   // 'connexion' | 'inscription'
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  async function envoyer(e) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    const { error } =
      mode === 'connexion'
        ? await signIn(email, motDePasse)
        : await signUp(email, motDePasse, nom)
    setEnCours(false)
    if (error) setErreur(error.message)
  }

  return (
    <main className="ecran-connexion">
      <h1>Ma To Do List</h1>

      <form onSubmit={envoyer}>
        {mode === 'inscription' && (
          <label>
            Nom affiché
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" />
          </label>
        )}

        <label>
          Adresse e-mail
          <input
            type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password" required minLength={8}
            autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
            value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>

        {erreur && <p role="alert" className="erreur">{erreur}</p>}

        <button type="submit" disabled={enCours}>
          {enCours ? 'Un instant…' : mode === 'connexion' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>

      <button
        type="button" className="lien"
        onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(null) }}
      >
        {mode === 'connexion' ? 'Créer un compte' : 'J\'ai déjà un compte'}
      </button>
    </main>
  )
}
