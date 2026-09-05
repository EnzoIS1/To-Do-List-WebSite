import { Outlet } from 'react-router-dom'
import Rail from './Rail'
import BarreOnglets from './BarreOnglets'
import { DonneesProvider } from '../../data/DonneesProvider'
import { useEstTelephone } from '../../lib/useEcran'

/**
 * La coque commune. Sur grand écran, le rail flottant à gauche et la carte
 * de contenu à côté ; sur téléphone, la barre d'onglets en bas. Les données
 * sont chargées une fois pour les deux.
 *
 * Le rail est maintenant un frère de la carte, plus une colonne à
 * l'intérieur : c'est ce que montre la référence, et ça permet à la carte
 * de contraindre sa propre hauteur sans se battre avec une grille.
 */
export default function AppShell() {
  const telephone = useEstTelephone()

  if (telephone) {
    return (
      <DonneesProvider>
        <div className="coque-telephone">
          <main className="zone-page">
            <Outlet />
          </main>
          <BarreOnglets />
        </div>
      </DonneesProvider>
    )
  }

  return (
    <DonneesProvider>
      <div className="coque">
        <Rail />
        <div className="carte-app">
          <main className="zone-page">
            <Outlet />
          </main>
        </div>
      </div>
    </DonneesProvider>
  )
}
