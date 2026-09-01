import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ThemeProvider } from './theme/ThemeProvider'
import RequireAuth from './auth/RequireAuth'
import RedirectIfAuth from './auth/RedirectIfAuth'
import LoginPage from './auth/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import AccountPage from './pages/AccountPage'

/**
 * HashRouter et non BrowserRouter — piège n°2 du document d'architecture.
 * GitHub Pages n'a pas de serveur pour réécrire les URLs.
 *
 * Le tableau de bord réunit le calendrier, le récapitulatif du jour, la liste
 * de courses, la boîte de réception et les catégories. Restent deux pages de
 * réglages : l'apparence et les catégories d'un côté, le compte de l'autre.
 */
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
              <Route index element={<DashboardPage />} />
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
