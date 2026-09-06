import { Link } from 'react-router-dom'
import { useCategories } from '../data/useCategories'
import { useTheme } from '../theme/ThemeProvider'
import { useDonnees } from '../data/DonneesProvider'
import { DELAIS_ARCHIVAGE } from '../lib/useReglage'
import SectionNotifications from '../components/reglages/SectionNotifications'

const OPTIONS_THEME = [
  { valeur: 'clair',   nom: 'Clair',   aide: 'Toujours le fond blanc.' },
  { valeur: 'sombre',  nom: 'Sombre',  aide: 'Toujours le fond sombre.' },
  { valeur: 'systeme', nom: 'Système', aide: 'Suit le réglage de ton ordinateur.' },
]

/**
 * Paramètres : l'apparence et les catégories.
 * Tout ce qui touche au compte est passé dans la page Compte.
 */
export default function SettingsPage() {
  const { arbre, modifier, supprimer, creer } = useCategories()
  const { theme, setTheme, accent, setAccent, accents, ambiance, setAmbiance, ambiances } = useTheme()
  const { delaiArchivage, setDelaiArchivage } = useDonnees()

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
          <p className="sous-titre">Apparence, notifications et catégories</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      <section>
        <h2>Thème</h2>
        <p className="aide">Ton choix est retenu sur cet appareil.</p>

        <div className="choix-theme" role="radiogroup" aria-label="Thème du site">
          {OPTIONS_THEME.map((o) => (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={theme === o.valeur}
              className={`carte-theme${theme === o.valeur ? ' actif' : ''}`}
              onClick={() => setTheme(o.valeur)}
            >
              <span className={`apercu-theme apercu-${o.valeur}`} aria-hidden="true">
                <span className="apercu-barre" />
                <span className="apercu-ligne" />
                <span className="apercu-ligne courte" />
              </span>
              <span className="carte-theme-nom">{o.nom}</span>
              <span className="carte-theme-aide">{o.aide}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Ambiance</h2>
        <p className="aide">
          Un habillage sombre complet : un fond dégradé derrière
          l'application, des panneaux en verre dépoli et une couleur
          d'accent assortie. Choisir une ambiance passe le site en thème
          sombre — le verre a besoin d'une lumière derrière pour se voir.
        </p>

        <div className="choix-ambiance" role="radiogroup" aria-label="Ambiance">
          <button
            type="button" role="radio" aria-checked={!ambiance}
            className={`carte-ambiance${!ambiance ? ' actif' : ''}`}
            onClick={() => setAmbiance(null)}
          >
            <span className="apercu-ambiance sans" aria-hidden="true" />
            <span className="carte-theme-nom">Aucune</span>
            <span className="carte-theme-aide">Le thème simple, sans fond ni verre.</span>
          </button>

          {ambiances.map((a) => (
            <button
              key={a.id}
              type="button" role="radio" aria-checked={ambiance === a.id}
              className={`carte-ambiance${ambiance === a.id ? ' actif' : ''}`}
              onClick={() => setAmbiance(a.id)}
            >
              <span className="apercu-ambiance" style={{ background: a.apercu }} aria-hidden="true">
                <span className="apercu-verre" />
              </span>
              <span className="carte-theme-nom">{a.nom}</span>
              <span className="carte-theme-aide">{a.aide}</span>
            </button>
          ))}
        </div>
      </section>

      <SectionNotifications />

      <section>
        <h2>Tâches terminées</h2>
        <p className="aide">
          Passé ce délai, une tâche terminée quitte l'affichage. <strong>Elle
          n'est pas supprimée</strong> : elle reste dans ta base et réapparaît
          si tu rallonges le délai. Le site cesse simplement de la demander,
          ce qui allège les chargements.
        </p>

        <div className="choix-delai" role="radiogroup" aria-label="Délai d'archivage">
          {DELAIS_ARCHIVAGE.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={delaiArchivage === d.id}
              className={`carte-delai${delaiArchivage === d.id ? ' actif' : ''}`}
              onClick={() => setDelaiArchivage(d.id)}
            >
              <span className="carte-delai-nom">{d.nom}</span>
              <span className="carte-delai-aide">{d.aide}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Couleur d'accent</h2>
        <p className="aide">
          La teinte des boutons, des compteurs et des éléments actifs. Chaque
          couleur est automatiquement assombrie en thème clair et éclaircie en
          thème sombre, pour rester lisible sur les deux fonds.
        </p>

        <div className="choix-accent">
          <button
            type="button"
            className={`pastille-accent defaut${!accent ? ' actif' : ''}`}
            onClick={() => setAccent(null)}
            title="Couleur d'origine du thème"
            aria-pressed={!accent}
          >
            <span className="pastille-accent-rond" />
            <span className="pastille-accent-nom">D'origine</span>
          </button>

          {accents.map((a) => (
            <button
              key={a.base}
              type="button"
              className={`pastille-accent${accent === a.base ? ' actif' : ''}`}
              onClick={() => setAccent(a.base)}
              title={a.nom}
              aria-pressed={accent === a.base}
            >
              <span className="pastille-accent-rond" style={{ background: a.base }} />
              <span className="pastille-accent-nom">{a.nom}</span>
            </button>
          ))}

          <label className="pastille-accent libre" title="Choisir librement">
            <input
              type="color"
              value={accent ?? '#BB86FC'}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Couleur d'accent personnalisée"
            />
            <span className="pastille-accent-nom">Au choix</span>
          </label>
        </div>
      </section>

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
                <button className="bouton-fin" onClick={() => ajouter(racine)}>+ sous-catégorie</button>
                <button className="bouton-fin danger" onClick={() => retirer(racine)}>Supprimer</button>
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
                        <button className="bouton-fin danger" onClick={() => retirer(enfant)}>Supprimer</button>
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
    </main>
  )
}
