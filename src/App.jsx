import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import RequireAuth from './auth/RequireAuth'
import RedirectIfAuth from './auth/RedirectIfAuth'
import LoginPage from './auth/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import EcranSoir from './pages/mobile/EcranSoir'
import EcranCalendrier from './pages/mobile/EcranCalendrier'
import EcranListes from './pages/mobile/EcranListes'
import SettingsPage from './pages/SettingsPage'
import AccountPage from './pages/AccountPage'
import { useEstTelephone } from './lib/useEcran'

/**
 * HashRouter et non BrowserRouter — GitHub Pages n'a pas de serveur pour
 * réécrire les URLs.
 *
 * Une seule application, deux mises en page. Sur grand écran l'accueil est le
 * tableau de bord, et les routes propres au téléphone y ramènent. Sur
 * téléphone l'accueil est « Ce soir », et le calendrier et les listes ont
 * chacun leur onglet — les cinq panneaux du bureau ne tiennent pas sur
 * 390 px sans devenir une page à faire défiler sans fin.
 */
function Accueil() {
  return useEstTelephone() ? <EcranSoir /> : <DashboardPage />
}

/** Sur grand écran, ces routes n'ont pas lieu d'être : tout est déjà à l'écran. */
function SiTelephone({ children }) {
  return useEstTelephone() ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route
              path="/connexion"
              element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>}
            />
            <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<Accueil />} />
              <Route path="calendrier" element={<SiTelephone><EcranCalendrier /></SiTelephone>} />
              <Route path="listes" element={<SiTelephone><EcranListes /></SiTelephone>} />
              <Route path="reglages" element={<SettingsPage />} />
              <Route path="compte" element={<AccountPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
