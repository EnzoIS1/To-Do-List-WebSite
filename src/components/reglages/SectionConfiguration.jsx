import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonnees } from '../../data/DonneesProvider'
import SelecteurListe from '../ui/SelecteurListe'
import { FONCTIONNALITES } from '../../lib/fonctionnalites'
import {
  EMPLACEMENTS, JOURS_SEMAINE, TOUS_LES_JOURS, EN_SEMAINE, resumeDesJours,
  PREMIERS_JOURS, FORMATS_BILAN, ECHEANCES_REPETITION, DELAIS_RELANCE_PROPOSES,
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

/* ── Tâches : la confirmation avant suppression ──────────────────── */
function ReglageSuppression() {
  const { confirmerSuppression, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        Supprimer une tâche est définitif : il n'y a pas d'annulation. La
        confirmation est éteinte par défaut — la demander alourdirait le
        geste le plus courant — mais elle existe pour qui préfère un filet.
      </p>
      <label className="menu-champ">
        <span>Demander confirmation avant de supprimer</span>
        <input
          type="checkbox" checked={confirmerSuppression}
          onChange={(e) => definirReglage('confirmerSuppression', e.target.checked)}
        />
      </label>
    </>
  )
}

/* ── Calendrier : le premier jour de la semaine ───────────────────── */
function ReglagePremierJour() {
  const { premierJour, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        La colonne de gauche du calendrier. <strong>Ce réglage vaut aussi
        pour le bilan de la semaine</strong> : un calendrier qui commence
        le dimanche et un bilan qui commence le lundi donneraient deux
        semaines différentes dans la même application.
      </p>
      <div className="menu-champ">
        <span>La semaine commence le</span>
        <SelecteurListe
          etiquette="Premier jour de la semaine"
          valeur={String(premierJour)}
          options={PREMIERS_JOURS.map((j) => ({ id: String(j.id), nom: j.nom }))}
          onChoisir={(v) => definirReglage('premierJour', Number(v))}
        />
      </div>
    </>
  )
}

/* ── Répétitions : l'échéance des occurrences ─────────────────────── */
function ReglageEcheanceRepetition() {
  const { echeanceRepetition, definirReglage } = useDonnees()
  const choisi = ECHEANCES_REPETITION.find((e) => e.id === echeanceRepetition)
  return (
    <>
      <p className="aide">
        Ce qui est proposé quand tu crées une répétition. Une occurrence
        datée déclenche le rappel automatique de la veille — c'est utile
        pour une révision, envahissant pour une liste de courses.
      </p>
      <div className="menu-champ">
        <span>Occurrences datées</span>
        <SelecteurListe
          etiquette="Échéance des occurrences"
          valeur={echeanceRepetition}
          options={ECHEANCES_REPETITION.map((e) => ({ id: e.id, nom: e.nom, detail: e.aide }))}
          onChoisir={(v) => definirReglage('echeanceRepetition', v)}
        />
      </div>
      <p className="aide">{choisi?.aide}</p>
    </>
  )
}

/* ── Notes : où atterrissent les nouvelles ────────────────────────── */
function ReglageCategorieNotes() {
  const { choixCategories, categorieNotesId, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        Les notes arrivent sans catégorie par défaut, ce qui est le propre
        d'une boîte de réception : on range ensuite. Si toutes tes notes
        finissent au même endroit, autant les y mettre tout de suite.
      </p>
      <div className="menu-champ">
        <span>Nouvelles notes rangées dans</span>
        <SelecteurListe
          etiquette="Catégorie des nouvelles notes"
          valeur={categorieNotesId ?? ''}
          options={[
            { id: '', nom: 'Aucune catégorie', detail: 'à ranger plus tard' },
            ...choixCategories.map((c) => ({ id: c.id, nom: c.chemin ?? c.name })),
          ]}
          onChoisir={(id) => definirReglage('categorieNotes', id || null)}
        />
      </div>
    </>
  )
}

/* ── Révision : le nombre de séances proposé ──────────────────────── */
function ReglageNombreRevisions() {
  const { nombreRevisionsDefaut, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        Le nombre de séances proposé quand tu actives les révisions.
        « Automatique » l'adapte au temps qui reste avant l'échéance.
        Les tâches qui ont déjà un rythme enregistré gardent le leur.
      </p>
      <div className="menu-champ">
        <span>Séances par défaut</span>
        <SelecteurListe
          etiquette="Nombre de séances par défaut"
          valeur={nombreRevisionsDefaut == null ? '' : String(nombreRevisionsDefaut)}
          options={[
            { id: '', nom: 'Automatique', detail: 'selon le temps disponible' },
            ...[2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => ({ id: String(n), nom: `${n} séances` })),
          ]}
          onChoisir={(v) => definirReglage('nombreRevisions', v ? Number(v) : null)}
        />
      </div>
    </>
  )
}

/* ── Délégation : le délai de relance par défaut ──────────────────── */
function ReglageDelaiRelance() {
  const { delaiRelanceDefaut, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        Le délai proposé quand tu notes une nouvelle attente. J'ai mis une
        semaine par défaut : c'est mon choix, pas le tien.
      </p>
      <div className="menu-puces" style={{ padding: '4px 0' }}>
        {DELAIS_RELANCE_PROPOSES.map((d) => (
          <button
            key={d.jours} type="button"
            className={`puce${delaiRelanceDefaut === d.jours ? ' posee' : ''}`}
            aria-pressed={delaiRelanceDefaut === d.jours}
            onClick={() => definirReglage('delaiRelance', d.jours)}
          >{d.nom}</button>
        ))}
      </div>
    </>
  )
}

/* ── Bilan : le format du texte copié ─────────────────────────────── */
function ReglageFormatBilan() {
  const { formatBilan, definirReglage } = useDonnees()
  return (
    <>
      <p className="aide">
        Ce que produit le bouton « Copier ». Le texte reste brut dans les
        deux cas : il doit survivre à un collage dans un mail ou un carnet.
      </p>
      <div className="menu-champ">
        <span>Format copié</span>
        <SelecteurListe
          etiquette="Format du bilan copié"
          valeur={formatBilan}
          options={FORMATS_BILAN.map((f) => ({ id: f.id, nom: f.nom, detail: f.aide }))}
          onChoisir={(v) => definirReglage('formatBilan', v)}
        />
      </div>
    </>
  )
}

/** Les réglages propres, par fonctionnalité. Chacune en a au moins un. */
const REGLAGES = {
  taches: ReglageSuppression,
  calendrier: ReglagePremierJour,
  rappels: ReglageJoursResume,
  repetitions: ReglageEcheanceRepetition,
  courses: ReglageCategorieCourses,
  notes: ReglageCategorieNotes,
  revision: ReglageNombreRevisions,
  delegation: ReglageDelaiRelance,
  bilan: ReglageFormatBilan,
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
