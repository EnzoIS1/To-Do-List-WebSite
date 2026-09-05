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
  reglages: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3L5.6 5.6" />
    </>
  ),
  compte: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
}

export default function Icone({ nom, taille = 22 }) {
  return <svg {...COMMUN} width={taille} height={taille}>{DESSINS[nom] ?? DESSINS.check}</svg>
}
