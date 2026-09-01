import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useCategories } from '../data/useCategories'

/**
 * Paramètres. La couleur d'une catégorie se change ici, et elle se répercute
 * partout : la pastille de la carte, le liseré du panneau, les pastilles du
 * calendrier. Tout lit la même colonne `categories.color`.
 */
export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { arbre, modifier, supprimer, creer } = useCategories()

  function ajouter(parent = null) {
    const name = window.prompt(
      parent ? `Nouvelle sous-catégorie dans « ${parent.name} »` : 'Nom de la nouvelle catégorie'
    )
    if (name?.trim()) {
      creer({ name: name.trim(), parent_id: parent?.id ?? null, color: parent?.color ?? '#14614E' })
    }
  }

  function retirer(categorie) {
    const ok = window.confirm(
      `Supprimer « ${categorie.name} » ? Ses tâches ne sont pas supprimées, elles se retrouvent sans catégorie.`
    )
    if (ok) supprimer(categorie.id)
  }

  return (
    <main className="page-reglages">
      <header className="entete-page">
        <div>
          <h1>Paramètres</h1>
          <p className="sous-titre">Connecté en tant que {user?.email}</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      <section>
        <h2>Couleurs des catégories</h2>
        <p className="aide">
          La couleur sert de repère visuel dans le calendrier et dans la colonne
          de droite. Le changement est enregistré immédiatement.
        </p>

        <ul className="reglage-categories">
          {arbre.map((racine) => (
            <li key={racine.id}>
              <div className="ligne-categorie" style={{ '--teinte': racine.color }}>
                <span className="pastille" />
                <input
                  className="nom-categorie"
                  value={racine.name}
                  onChange={(e) => modifier(racine.id, { name: e.target.value })}
                  aria-label={`Nom de ${racine.name}`}
                />
                <input
                  type="color"
                  value={racine.color}
                  onChange={(e) => modifier(racine.id, { color: e.target.value })}
                  aria-label={`Couleur de ${racine.name}`}
                />
                <button className="lien" onClick={() => ajouter(racine)}>+ sous-catégorie</button>
                <button className="lien danger" onClick={() => retirer(racine)}>Supprimer</button>
              </div>

              {racine.enfants.length > 0 && (
                <ul>
                  {racine.enfants.map((enfant) => (
                    <li key={enfant.id}>
                      <div className="ligne-categorie" style={{ '--teinte': enfant.color }}>
                        <span className="pastille" />
                        <input
                          className="nom-categorie"
                          value={enfant.name}
                          onChange={(e) => modifier(enfant.id, { name: e.target.value })}
                          aria-label={`Nom de ${enfant.name}`}
                        />
                        <input
                          type="color"
                          value={enfant.color}
                          onChange={(e) => modifier(enfant.id, { color: e.target.value })}
                          aria-label={`Couleur de ${enfant.name}`}
                        />
                        <button className="lien danger" onClick={() => retirer(enfant)}>Supprimer</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <button className="bouton-doux" onClick={() => ajouter(null)}>
          + Créer une catégorie
        </button>
      </section>

      <section>
        <h2>Compte</h2>
        <button className="bouton-doux" onClick={signOut}>Se déconnecter</button>
      </section>
    </main>
  )
}
