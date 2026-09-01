import { useAuth } from '../auth/AuthProvider'
import { useCategories } from '../data/useCategories'

export default function SettingsPage() {
  const { user } = useAuth()
  const { arbre, creer, supprimer } = useCategories()

  return (
    <>
      <h1>Réglages</h1>

      <section>
        <h2>Compte</h2>
        <p>Connecté en tant que <strong>{user?.email}</strong>.</p>
      </section>

      <section>
        <h2>Catégories</h2>
        <ul className="reglage-categories">
          {arbre.map((racine) => (
            <li key={racine.id}>
              {racine.name}
              <button className="lien" onClick={() => supprimer(racine.id)}>Supprimer</button>
              <ul>
                {racine.enfants.map((e) => (
                  <li key={e.id}>
                    {e.name}
                    <button className="lien" onClick={() => supprimer(e.id)}>Supprimer</button>
                  </li>
                ))}
                <li>
                  <button
                    className="lien"
                    onClick={() => {
                      const name = window.prompt(`Nouvelle sous-catégorie dans « ${racine.name} »`)
                      if (name) creer({ name, parent_id: racine.id, color: racine.color })
                    }}
                  >
                    + Ajouter
                  </button>
                </li>
              </ul>
            </li>
          ))}
        </ul>

        <button
          className="lien"
          onClick={() => {
            const name = window.prompt('Nouvelle catégorie')
            if (name) creer({ name })
          }}
        >
          + Nouvelle catégorie
        </button>
      </section>
    </>
  )
}
