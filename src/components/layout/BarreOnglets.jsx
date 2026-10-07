import { NavLink } from 'react-router-dom'
import Icone from './Icones'
import { useDonnees } from '../../data/DonneesProvider'
import { AVEC_EMPLACEMENT } from '../../lib/fonctionnalites'

/**
 * La barre d'onglets du téléphone, en bas de l'écran.
 *
 * ─────────────────────────────────────────────────────────────────────
 * MÊME LANGAGE QUE LE RAIL DU BUREAU
 *
 * Les deux navigations disaient la même chose de deux façons : à gauche
 * une pastille flottante à coins ronds, icônes seules, entrée courante en
 * carré plein ; en bas une bande collée au bord avec des libellés de
 * 10 px. Passer d'un appareil à l'autre demandait de réapprendre où
 * regarder.
 *
 * La barre reprend donc le vocabulaire du rail : détachée du bord, coins
 * arrondis, même fond, icônes seules dans la même case de 40 px, entrée
 * courante en plein. Les libellés partent — sur 5 entrées ils tenaient en
 * 9 px de haut — et sont remplacés par l'`aria-label`, que les lecteurs
 * d'écran annoncent aussi bien.
 *
 * Une entrée en plus : « Rappels », avec sa pastille de compte, comme
 * dans le rail. C'est l'appareil qu'on a sur soi ; c'est là que le
 * rappel a le plus de raisons d'être consulté.
 * ─────────────────────────────────────────────────────────────────────
 */
const ONGLETS = [
  { to: '/', fin: true, nom: 'Tâches', icone: 'check' },
  { to: '/calendrier', nom: 'Calendrier', icone: 'calendrier' },
  { to: '/rappels', nom: 'Rappels', icone: 'cloche', compteur: true },
  // Remplace l'ancien onglet « Listes » : la page qui permet de
  // choisir ses fonctionnalités n'était atteignable que par un lien
  // au fond des paramètres, donc en pratique introuvable sur téléphone.
  { to: '/fonctionnalites', nom: 'Fonctionnalités', icone: 'briques' },
  { to: '/reglages', nom: 'Réglages', icone: 'reglages' },
]

export default function BarreOnglets() {
  const { rappelsEchus, tasks, fonctionActive, emplacementDe } = useDonnees()

  /*
   * ⚠️ CE QUE LE RETRAIT DE « LISTES » COÛTE SUR TÉLÉPHONE
   *
   * Sur ordinateur, les courses et les notes ont leurs panneaux sur le
   * tableau de bord. Sur téléphone, l'accueil ne montre que les tâches du
   * jour : sans l'onglet « Listes », elles n'étaient plus atteignables du
   * tout.
   *
   * Le rail le résolvait déjà pour le bureau : une fonctionnalité réglée
   * sur « page dédiée » y apparaît. On applique la même règle ici. Deux
   * au maximum — la barre n'a que cinq places, et sept icônes de 9 px de
   * large ne se visent plus au pouce.
   */
  const pagesDeFonctions = AVEC_EMPLACEMENT
    .filter((f) => fonctionActive(f.id) && emplacementDe(f.id) === 'page')
    .slice(0, 2)

  // Le compte n'annonce que ce qui est réellement à faire : un rappel dont
  // la tâche est cochée gonflerait la pastille sans rien vouloir dire.
  // Même règle que dans le rail, volontairement.
  const aTraiter = rappelsEchus.filter(
    (r) => tasks.some((t) => t.id === r.task_id && !t.is_done)
  ).length

  return (
    <nav className="barre-onglets" aria-label="Navigation">
      {[
        ...ONGLETS.filter((o) => o.to !== '/reglages'),
        ...pagesDeFonctions.map((f) => ({ to: `/f/${f.id}`, nom: f.nom, icone: 'liste' })),
        // Les réglages restent le dernier onglet, quoi qu'il arrive : on
        // les cherche toujours au même endroit.
        ONGLETS.find((o) => o.to === '/reglages'),
      ].map((o) => (
        <NavLink
          key={o.to}
          to={o.to}
          end={o.fin}
          className="onglet"
          aria-label={o.nom}
          title={o.nom}
        >
          <Icone nom={o.icone} />
          {o.compteur && aTraiter > 0 && (
            <span className="rail-pastille" aria-label={`${aTraiter} rappel(s)`}>
              {aTraiter > 9 ? '9+' : aTraiter}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
