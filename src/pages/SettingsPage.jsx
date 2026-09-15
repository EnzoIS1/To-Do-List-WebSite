import { Link } from 'react-router-dom'
import { useCategories } from '../data/useCategories'
import { useTheme } from '../theme/ThemeProvider'
import { useDonnees } from '../data/DonneesProvider'
import { DELAIS_ARCHIVAGE } from '../lib/useReglage'
import SectionNotifications from '../components/reglages/SectionNotifications'
import SectionConfiguration from '../components/reglages/SectionConfiguration'
import SectionRepliable from '../components/reglages/SectionRepliable'

const OPTIONS_THEME = [
  { valeur: 'clair',   nom: 'Clair',   aide: 'Toujours le fond blanc.' },
  { valeur: 'sombre',  nom: 'Sombre',  aide: 'Toujours le fond sombre.' },
  { valeur: 'systeme', nom: 'Système', aide: 'Suit le réglage de ton ordinateur.' },
]

/**
 * Paramètres.
 *
 * ─────────────────────────────────────────────────────────────────────
 * TOUT EST REPLIÉ PAR DÉFAUT
 *
 * Déroulée en entier, cette page faisait cinq écrans, et elle grandit à
 * chaque ajout. Repliée, elle tient sur un seul : on lit les titres, on
 * ouvre ce qu'on cherche. C'est une table des matières, pas un
 * formulaire.
 *
 * Chaque tête de section montre un APERÇU — le thème actuel, l'ambiance,
 * la couleur d'accent — pour que l'information la plus souvent
 * consultée se lise sans rien ouvrir.
 *
 * CE QUI EST ICI, ET CE QUI N'Y EST PAS
 *
 * Ici : le RÉGLAGE de ce qui est actif. Le CHOIX de ce qui est actif est
 * sur la page Fonctionnalités — les deux confondus rendaient la page
 * interminable et noyaient le réglage utile entre deux descriptions.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function SettingsPage() {
  const { arbre, modifier, supprimer, creer } = useCategories()
  const {
    theme, setTheme, accent, setAccent, accents,
    ambiance, setAmbiance, ambiances, resolu,
  } = useTheme()
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

  const ambianceChoisie = ambiances.find((a) => a.id === ambiance)
  const nomAmbiance = ambianceChoisie
    ? ambianceChoisie[resolu === 'sombre' ? 'sombre' : 'clair'].nom
    : 'Aucune'
  const nomDelai = DELAIS_ARCHIVAGE.find((d) => d.id === delaiArchivage)?.nom ?? null
  const nbCategories = arbre.reduce((n, r) => n + 1 + r.enfants.length, 0)

  return (
    <main className="page-reglages">
      <header className="entete-page">
        <div>
          <h1>Paramètres</h1>
          <p className="sous-titre">Apparence, fonctionnalités, notifications et catégories</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      <SectionRepliable
        id="theme" titre="Thème"
        aide="Clair, sombre, ou celui de ton système."
        apercu={OPTIONS_THEME.find((o) => o.valeur === theme)?.nom}
      >
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
      </SectionRepliable>

      <SectionRepliable
        id="ambiance" titre="Ambiance"
        aide="Un fond dégradé et des panneaux en verre dépoli."
        apercu={nomAmbiance}
      >
        <p className="aide">
          Chaque ambiance a un visage de jour et un visage de nuit — c'est
          le thème choisi plus haut qui décide lequel s'affiche, et les
          aperçus ci-dessous montrent celui en cours.
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

          {ambiances.map((a) => {
            const face = a[resolu === 'sombre' ? 'sombre' : 'clair']
            return (
              <button
                key={a.id}
                type="button" role="radio" aria-checked={ambiance === a.id}
                className={`carte-ambiance${ambiance === a.id ? ' actif' : ''}`}
                onClick={() => setAmbiance(a.id)}
              >
                <span className="apercu-ambiance" style={{ background: face.apercu }} aria-hidden="true">
                  <span className="apercu-verre" />
                </span>
                <span className="carte-theme-nom">{face.nom}</span>
                <span className="carte-theme-aide">{face.aide}</span>
              </button>
            )
          })}
        </div>
      </SectionRepliable>

      <SectionRepliable
        id="accent" titre="Couleur d'accent"
        aide="La teinte des boutons et des éléments actifs."
        apercu={(
          <span
            className="apercu-pastille"
            style={{ background: accent ?? 'var(--accent)' }}
            aria-hidden="true"
          />
        )}
      >
        <p className="aide">
          Chaque couleur est automatiquement assombrie en thème clair et
          éclaircie en thème sombre, pour rester lisible sur les deux fonds.
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
      </SectionRepliable>

      <SectionRepliable
        id="configuration" titre="Fonctionnalités"
        aide="Régler le détail de ce que tu as activé."
      >
        <SectionConfiguration />
      </SectionRepliable>

      <SectionRepliable
        id="notifications" titre="Notifications"
        aide="Le résumé du matin, et les notifications sur cet appareil."
      >
        <SectionNotifications />
      </SectionRepliable>

      <SectionRepliable
        id="archivage" titre="Tâches terminées"
        aide="Quand une tâche cochée quitte l'affichage."
        apercu={nomDelai}
      >
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
      </SectionRepliable>

      <SectionRepliable
        id="categories" titre="Catégories"
        aide="Les noms et les couleurs de tes catégories."
        apercu={`${nbCategories}`}
      >
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
      </SectionRepliable>
    </main>
  )
}
