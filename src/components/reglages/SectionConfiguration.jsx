import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonnees } from '../../data/DonneesProvider'
import SelecteurListe from '../ui/SelecteurListe'
import { FONCTIONNALITES } from '../../lib/fonctionnalites'
import {
  EMPLACEMENTS, JOURS_SEMAINE, TOUS_LES_JOURS, EN_SEMAINE, resumeDesJours,
} from '../../lib/reglages'

/**
 * La configuration des fonctionnalités actives.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DEUX SORTES DE RÉGLAGES, ET ILS N'ONT PAS LE MÊME STATUT
 *
 * 1. L'EMPLACEMENT, commun à toutes celles qui ont un panneau. Un seul
 *    mécanisme, qui sert chaque fonctionnalité présente et future.
 * 2. LES RÉGLAGES PROPRES, écrits au cas par cas dans `REGLAGES`.
 *
 * Un bloc sans réglage propre le DIT, au lieu d'afficher des options
 * inventées pour remplir l'écran. Quand un réglage existera, il
 * apparaîtra ici — pas avant.
 * ─────────────────────────────────────────────────────────────────────
 */

/* ── Les jours du résumé ────────────────────────────────────────────
   ⚠️ Ce réglage-là n'est pas un confort d'affichage : il est lu CÔTÉ
   SERVEUR par resumes_a_envoyer() (migration 0014). Décocher samedi et
   dimanche empêche réellement l'envoi, ce n'est pas un masquage. */
function ReglageJoursResume() {
  const { joursResume: jours, definirReglage } = useDonnees()

  const basculer = (n) => definirReglage(
    'joursResume',
    jours.includes(n) ? jours.filter((x) => x !== n) : [...jours, n].sort((a, b) => a - b)
  )

  return (
    <>
      <p className="aide">
        Les jours où le résumé du matin est envoyé. Recevoir une
        notification à 7 h le dimanche est l'une des meilleures façons de
        se faire couper les notifications pour de bon.
      </p>

      <div className="menu-puces" style={{ padding: '4px 0' }}>
        {JOURS_SEMAINE.map((j) => (
          <button
            key={j.n}
            type="button"
            className={`puce${jours.includes(j.n) ? ' posee' : ''}`}
            aria-pressed={jours.includes(j.n)}
            aria-label={j.nom}
            onClick={() => basculer(j.n)}
          >{j.court}</button>
        ))}
      </div>

      <div className="menu-puces" style={{ padding: '0 0 4px' }}>
        <button type="button" className="bouton-fin"
          onClick={() => definirReglage('joursResume', TOUS_LES_JOURS)}>
          Tous les jours
        </button>
        <button type="button" className="bouton-fin"
          onClick={() => definirReglage('joursResume', EN_SEMAINE)}>
          En semaine seulement
        </button>
      </div>

      <p className="aide">
        Actuellement : <strong>{resumeDesJours(jours)}</strong>.
        {jours.length === 0 && ' Tout décocher revient à tous les jours — pour couper le résumé, utilise l\'interrupteur des notifications.'}
      </p>
    </>
  )
}

/* ── Quelle catégorie sert de liste de courses ──────────────────────
   Ce réglage corrige un piège : la catégorie était devinée par son NOM,
   et la renommer vidait le panneau sans le moindre message. */
function ReglageCategorieCourses() {
  const { choixCategories, categorieCourses, definirReglage } = useDonnees()

  return (
    <>
      <p className="aide">
        Quelle catégorie s'affiche dans le panneau « Liste de courses ».
        Sans choix, le site prend la première dont le nom commence par
        « course » — et la renommer suffisait à vider le panneau, sans
        explication. C'est ce piège que ce réglage supprime.
      </p>

      <div className="menu-champ">
        <span>Ma liste de courses</span>
        <SelecteurListe
          etiquette="Catégorie de la liste de courses"
          valeur={categorieCourses?.id ?? ''}
          options={[
            { id: '', nom: 'Détection automatique', detail: 'par le nom « Courses »' },
            ...choixCategories.map((c) => ({ id: c.id, nom: c.chemin ?? c.name })),
          ]}
          onChoisir={(id) => definirReglage('categorieCourses', id || null)}
        />
      </div>

      {!categorieCourses && (
        <p className="aide erreur">
          Aucune catégorie trouvée : le panneau des courses est vide. Choisis-en
          une ci-dessus, ou crée une catégorie « Courses ».
        </p>
      )}
    </>
  )
}

/** Les réglages propres, par fonctionnalité. */
const REGLAGES = {
  rappels: ReglageJoursResume,
  courses: ReglageCategorieCourses,
}

export default function SectionConfiguration() {
  const { fonctionActive, emplacementDe, definirEmplacement } = useDonnees()
  const [ouvert, setOuvert] = useState(null)

  const actives = FONCTIONNALITES.filter((f) => fonctionActive(f.id))

  return (
    <>
      <p className="aide">
        Le détail de chaque fonctionnalité que tu as gardée. Pour en
        allumer ou en éteindre, c'est sur la page{' '}
        <Link to="/fonctionnalites">Fonctionnalités</Link>.
      </p>

      <ul className="liste-config">
        {actives.map((f) => {
          const Reglage = REGLAGES[f.id]
          const deplacable = Boolean(f.panneau)
          const deplie = ouvert === f.id
          const rien = !Reglage && !deplacable

          return (
            <li key={f.id} className="ligne-config">
              <div className="config-tete">
                <div className="config-texte">
                  <strong>{f.nom}</strong>
                  <p className="aide">{f.resume}</p>
                </div>
                <button
                  type="button"
                  className="bouton-fin"
                  aria-expanded={deplie}
                  onClick={() => setOuvert(deplie ? null : f.id)}
                >
                  {deplie ? 'Fermer' : 'Configurer'}
                </button>
              </div>

              {deplie && (
                <div className="config-corps">
                  {deplacable && (
                    <div className="menu-champ">
                      <span>Où l'afficher</span>
                      <SelecteurListe
                        etiquette={`Emplacement de ${f.nom}`}
                        valeur={emplacementDe(f.id)}
                        options={EMPLACEMENTS.map((e) => ({
                          id: e.id, nom: e.nom, detail: e.aide,
                        }))}
                        onChoisir={(v) => definirEmplacement(f.id, v)}
                      />
                    </div>
                  )}

                  {Reglage && <Reglage />}

                  {rien && (
                    <p className="aide">
                      Rien à régler ici pour l'instant. Dis-moi ce que tu
                      voudrais pouvoir changer sur « {f.nom} » et je
                      l'ajoute à cet endroit.
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
