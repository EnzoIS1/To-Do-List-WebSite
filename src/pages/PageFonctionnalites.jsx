import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonnees } from '../data/DonneesProvider'
import {
  FONCTIONNALITES, METIERS, fonctionActive, nomDuMetier,
} from '../lib/fonctionnalites'

/**
 * La page Fonctionnalités : ce qui existe, ce que ça fait, et ce qu'on garde.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI UNE PAGE ET PAS UNE SECTION DES PARAMÈTRES
 *
 * Deux besoins qu'on confondait. DÉCOUVRIR ce que le site sait faire et
 * choisir ce qu'on veut, d'un côté ; RÉGLER le détail de ce qu'on a
 * choisi, de l'autre. Empilés, ils faisaient une page de paramètres qui
 * s'allongeait à chaque ajout et où le réglage utile se perdait entre
 * deux descriptions.
 *
 * Ici, chaque fonctionnalité a la place de dire ce qu'elle fait — c'est
 * la seule occasion qu'on a de l'expliquer. Les paramètres, eux, ne
 * gardent que la configuration de ce qui est actif.
 *
 * LA BASE N'A PAS D'INTERRUPTEUR
 *
 * Elle est listée quand même, et c'est volontaire : quelqu'un qui
 * découvre le site doit voir le produit entier, pas seulement les
 * options. Mais elle est marquée « incluse » et ne se coupe pas — des
 * courses ou des rappels débrayables ne seraient pas de la souplesse,
 * juste une façon de casser son propre site.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function PageFonctionnalites() {
  const {
    metier, modules, choisirMetier, basculerFonction, fonctionActive: estActive,
  } = useDonnees()

  const [aConfirmer, setAConfirmer] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [deplie, setDeplie] = useState(null)

  async function appliquer(promesse) {
    setErreur(null)
    const { error } = (await promesse) ?? {}
    // Un bouton qui échoue doit le DIRE. La version précédente avalait
    // l'erreur : on cliquait, rien ne se passait, et rien n'expliquait
    // pourquoi. C'est la pire façon d'échouer.
    if (error) setErreur(error.message ?? 'Le réglage n\'a pas pu être enregistré.')
  }

  function cliquerMetier(id) {
    if (id === metier) return
    // Le premier choix n'écrase rien : pas de confirmation à demander.
    if (!metier) return appliquer(choisirMetier(id))
    if (aConfirmer !== id) return setAConfirmer(id)
    setAConfirmer(null)
    appliquer(choisirMetier(id))
  }

  const groupes = [
    { titre: 'Toujours incluses', aide: 'Le cœur du site. Rien à régler, rien à éteindre.', liste: FONCTIONNALITES.filter((f) => f.base) },
    { titre: 'Selon ce que tu fais', aide: 'Allumées par défaut selon ton métier, réglables une par une.', liste: FONCTIONNALITES.filter((f) => !f.base) },
  ]

  return (
    <main className="page-reglages">
      <header className="entete-page">
        <div>
          <h1>Fonctionnalités</h1>
          <p className="sous-titre">Ce que le site sait faire, et ce que tu gardes</p>
        </div>
        <Link to="/" className="bouton-doux">← Tableau de bord</Link>
      </header>

      {erreur && (
        <p className="aide erreur">
          {erreur} — si le message parle d'une colonne inconnue, c'est
          qu'une migration n'a pas été passée dans Supabase.
        </p>
      )}

      <section>
        <h2>Ce que tu fais</h2>
        <p className="aide">
          Ton métier ne retire jamais rien : il allume simplement les
          fonctionnalités qui servent le plus dans ce contexte. Tout reste
          modifiable en dessous.
        </p>

        <div className="choix-metier" role="radiogroup" aria-label="Métier">
          {METIERS.map((m) => {
            const actif = metier === m.id
            const arme = aConfirmer === m.id
            return (
              <button
                key={m.id}
                type="button" role="radio" aria-checked={actif}
                className={`puce-metier${actif ? ' actif' : ''}${arme ? ' arme' : ''}`}
                onClick={() => cliquerMetier(m.id)}
                title={m.aide}
              >
                {arme ? `Confirmer « ${m.nom} »` : m.nom}
              </button>
            )
          })}
        </div>
        <p className="aide">
          {metier
            ? `Réglages conseillés pour « ${nomDuMetier(metier)} ». Changer de métier les remet à zéro, d'où la confirmation.`
            : 'Aucun métier choisi : tout est allumé.'}
        </p>
      </section>

      {groupes.map((g) => (
        <section key={g.titre}>
          <h2>{g.titre}</h2>
          <p className="aide">{g.aide}</p>

          <ul className="liste-fonctions">
            {g.liste.map((f) => {
              const active = estActive(f.id)
              const ouvert = deplie === f.id
              return (
                <li key={f.id} className={`carte-fonction${active ? '' : ' eteinte'}`}>
                  <div className="fonction-tete">
                    <div className="fonction-texte">
                      <strong>{f.nom}</strong>
                      <p className="aide">{f.resume}</p>
                    </div>

                    {f.base ? (
                      <span className="jeton-incluse">Incluse</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        aria-label={`${f.nom} : ${active ? 'allumée' : 'éteinte'}`}
                        className={`interrupteur compact${active ? ' allume' : ''}`}
                        onClick={() => appliquer(basculerFonction(f.id, !active))}
                      >
                        <span className="interrupteur-piste"><span className="interrupteur-bouton" /></span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="bouton-fin fonction-detail"
                    aria-expanded={ouvert}
                    onClick={() => setDeplie(ouvert ? null : f.id)}
                  >
                    {ouvert ? 'Masquer' : 'En savoir plus'}
                  </button>
                  {ouvert && <p className="aide fonction-explication">{f.detail}</p>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="aide">
        Les réglages de chaque fonctionnalité — l'heure du résumé, le délai
        d'archivage, les couleurs — restent dans les{' '}
        <Link to="/reglages">paramètres</Link>.
      </p>
    </main>
  )
}
