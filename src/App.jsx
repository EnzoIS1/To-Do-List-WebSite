import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import RequireAuth from './auth/RequireAuth'
import RedirectIfAuth from './auth/RedirectIfAuth'
import LoginPage from './auth/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import PageCalendrier from './pages/PageCalendrier'
import PageListes from './pages/PageListes'
import PageRappels from './pages/PageRappels'
import EcranTaches from './pages/mobile/EcranTaches'
import EcranCalendrier from './pages/mobile/EcranCalendrier'
import EcranListes from './pages/mobile/EcranListes'
import EcranRappels from './pages/mobile/EcranRappels'
import SettingsPage from './pages/SettingsPage'
import AccountPage from './pages/AccountPage'
import { useEstTelephone } from './lib/useEcran'

/**
 * HashRouter et non BrowserRouter — GitHub Pages n'a pas de serveur pour
 * réécrire les URLs.
 *
 * Une seule application, deux mises en page. Chaque route a sa version
 * téléphone et sa version bureau, choisies ici et nulle part ailleurs.
 *
 * Avant, `/calendrier` et `/listes` renvoyaient au tableau de bord sur grand
 * écran, au prétexte que tout y était déjà. C'était vrai en information,
 * faux en usage : le calendrier d'un panneau de 8 colonnes ne montre pas les
 * mêmes choses qu'un calendrier plein écran, et le rail avait des entrées
 * qui ne menaient nulle part.
 */
function Accueil() {
  return useEstTelephone() ? <EcranTaches /> : <DashboardPage />
}

function Calendrier() {
  return useEstTelephone() ? <EcranCalendrier /> : <PageCalendrier />
}

function Rappels() {
  return useEstTelephone() ? <EcranRappels /> : <PageRappels />
}

function Listes({ vue = 'courses' }) {
  return useEstTelephone() ? <EcranListes vueInitiale={vue} /> : <PageListes vueInitiale={vue} />
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
              <Route path="calendrier" element={<Calendrier />} />
              <Route path="rappels" element={<Rappels />} />
              <Route path="listes" element={<Listes />} />
              <Route path="notes" element={<Listes vue="notes" />} />
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
