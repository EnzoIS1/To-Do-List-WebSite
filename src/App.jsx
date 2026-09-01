import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import RedirectIfAuth from './auth/RedirectIfAuth'
import LoginPage from './auth/LoginPage'
import AppShell from './components/layout/AppShell'
import TodayPage from './pages/TodayPage'
import CalendarPage from './pages/CalendarPage'
import CategoryPage from './pages/CategoryPage'
import SettingsPage from './pages/SettingsPage'

/**
 * HashRouter et non BrowserRouter — piège n°2 du document d'architecture.
 *
 * GitHub Pages n'a pas de serveur pour réécrire les URLs : recharger la page
 * sur /calendrier renverrait une erreur 404. Les URLs à dièse (/#/calendrier)
 * fonctionnent sans rien configurer.
 *
 * Le workflow de déploiement copie déjà index.html en 404.html, donc le jour
 * où les URLs propres t'importent, il suffit de remplacer HashRouter par
 * BrowserRouter avec basename={import.meta.env.BASE_URL}.
 *
 * Les deux routes sont gardées symétriquement : RequireAuth interdit les pages
 * privées aux visiteurs, RedirectIfAuth interdit l'écran de connexion aux
 * personnes déjà connectées. Sans cette seconde garde, une connexion réussie
 * laisse l'utilisateur devant le formulaire, sans le moindre message.
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
          <Route
            path="/"
            element={<RequireAuth><AppShell /></RequireAuth>}
          >
            <Route index element={<TodayPage />} />
            <Route path="calendrier" element={<CalendarPage />} />
            <Route path="categorie/:id" element={<CategoryPage />} />
            <Route path="reglages" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
