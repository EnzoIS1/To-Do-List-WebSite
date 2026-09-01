import { Outlet } from 'react-router-dom'
import Rail from './Rail'

/**
 * La coque commune : le rail étroit à gauche, la page à droite.
 * Le tableau de bord occupe toute la hauteur de la fenêtre et chaque panneau
 * défile pour son compte — d'où le `height: 100vh` côté CSS.
 */
export default function AppShell() {
  return (
    <div className="coque">
      <Rail />
      <Outlet />
    </div>
  )
}
