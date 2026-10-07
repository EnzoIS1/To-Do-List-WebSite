/**
 * Les pictogrammes de la navigation, partagés par le rail du bureau et la
 * barre d'onglets du téléphone.
 *
 * Ils sont dessinés en SVG plutôt que pris dans une police d'icônes : une
 * police, c'est un fichier de plus à charger avant le premier affichage, et
 * un caractère manquant se voit tout de suite. Ici, tout est dans le code et
 * la couleur suit `currentColor`, donc le thème sombre est gratuit.
 */
const COMMUN = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
}

const DESSINS = {
  tableau: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  liste: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  note: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  cloche: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </>
  ),
  /*
   * L'engrenage, avec de vraies dents.
   *
   * L'ancienne version était un cercle entouré de huit traits radiaux :
   * dessinée petite, elle se lisait comme un soleil, pas comme un
   * réglage. Les dents sont ici des créneaux refermés sur le contour,
   * ce qui donne la silhouette qu'on reconnaît même à 20 px.
   */
  reglages: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a1.95 1.95 0 1 1-2.76 2.76l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.95 1.95 0 0 1-3.9 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.95 1.95 0 1 1-2.76-2.76l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.95 1.95 0 0 1 0-3.9h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.95 1.95 0 1 1 2.76-2.76l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.95 1.95 0 0 1 3.9 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.95 1.95 0 1 1 2.76 2.76l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.95 1.95 0 0 1 0 3.9h-.09a1.6 1.6 0 0 0-1.47.97z" />
    </>
  ),
  compte: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  briques: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
}

export default function Icone({ nom, taille = 22 }) {
  return <svg {...COMMUN} width={taille} height={taille}>{DESSINS[nom] ?? DESSINS.check}</svg>
}
