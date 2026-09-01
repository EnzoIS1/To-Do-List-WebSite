import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import RedirectIfAuth from './auth/RedirectIfAuth'
import LoginPage from './auth/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

/**
 * HashRouter et non BrowserRouter — piège n°2 du document d'architecture.
 * GitHub Pages n'a pas de serveur pour réécrire les URLs.
 *
 * Depuis la refonte du visuel, tout tient sur une seule page : le tableau de
 * bord réunit le calendrier, le récapitulatif du jour, la liste de courses,
 * la boîte de réception et les catégories. Il ne reste que les paramètres
 * comme seconde page — c'est ce que montre le croquis, où la barre de gauche
 * ne contient que Paramètres et Compte.
 */
export default function App() {
  return (
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
