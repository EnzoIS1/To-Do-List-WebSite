import { useReglage } from '../../lib/useReglage'

/**
 * Une section de réglages qui s'ouvre et se ferme.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI
 *
 * La page de paramètres grandit à chaque ajout. Déroulée en entier, elle
 * oblige à faire défiler cinq écrans pour atteindre un réglage qu'on
 * connaît déjà — et elle donne l'impression d'un formulaire administratif
 * plutôt que d'un site qu'on configure.
 *
 * Fermée par défaut, elle tient sur un écran : on lit les titres, on
 * ouvre celui qu'on cherche. C'est une table des matières qui se déplie.
 *
 * L'ÉTAT EST RETENU, ET LOCALEMENT
 *
 * Retenu, parce que refermer à chaque visite la section qu'on ouvre
 * toujours serait une punition. Localement (localStorage) et pas en base,
 * parce que c'est un confort d'affichage propre à l'appareil : rien
 * n'oblige le téléphone et l'ordinateur à s'accorder là-dessus, et ça
 * n'a aucun intérêt pour le serveur.
 *
 * ACCESSIBILITÉ
 *
 * C'est un <button> avec `aria-expanded`, pas un <div> cliquable : le
 * clavier et les lecteurs d'écran doivent pouvoir l'ouvrir aussi. Le
 * contenu fermé est RETIRÉ du DOM, pas seulement masqué — sinon la
 * tabulation traverserait des champs invisibles.
 * ─────────────────────────────────────────────────────────────────────
 *
 * @param {object} props
 * @param {string} props.id        identifiant stable, sert de clé de mémoire
 * @param {string} props.titre
 * @param {string} [props.aide]    une ligne sous le titre, visible même fermée
 * @param {React.ReactNode} [props.apercu]  ce qui se lit sans ouvrir (un état, un compte)
 */
export default function SectionRepliable({ id, titre, aide, apercu, children }) {
  const [ouverts, setOuverts] = useReglage('todo-reglages-ouverts', [])
  const ouvert = ouverts.includes(id)

  const basculer = () => setOuverts(
    ouvert ? ouverts.filter((x) => x !== id) : [...ouverts, id]
  )

  return (
    <section className={`section-repliable${ouvert ? ' ouverte' : ''}`}>
      <button
        type="button"
        className="section-tete"
        aria-expanded={ouvert}
        onClick={basculer}
      >
        <span className="section-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span className="section-titre">
          <strong>{titre}</strong>
          {aide && <span>{aide}</span>}
        </span>
        {apercu && <span className="section-apercu">{apercu}</span>}
      </button>

      {ouvert && <div className="section-corps">{children}</div>}
    </section>
  )
}
