import { Outlet } from 'react-router-dom'
import Rail from './Rail'
import BarreOnglets from './BarreOnglets'
import { DonneesProvider } from '../../data/DonneesProvider'
import { useEstTelephone } from '../../lib/useEcran'

/**
 * La coque commune. Sur grand écran, le rail étroit à gauche ; sur téléphone,
 * la barre d'onglets en bas. Les données sont chargées une fois pour les deux.
 */
export default function AppShell() {
  const telephone = useEstTelephone()

  return (
    <DonneesProvider>
      <div className={telephone ? 'coque-telephone' : 'coque'}>
        {!telephone && <Rail />}
        <main className="zone-page">
          <Outlet />
        </main>
        {telephone && <BarreOnglets />}
      </div>
    </DonneesProvider>
  )
}
