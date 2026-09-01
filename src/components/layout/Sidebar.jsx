import { NavLink } from 'react-router-dom'
import CategoryNav from '../categories/CategoryNav'

export default function Sidebar() {
  return (
    <nav className="barre-laterale">
      <p className="marque">Ma To Do List</p>

      <ul className="nav-principale">
        <li><NavLink to="/" end>Aujourd'hui</NavLink></li>
        <li><NavLink to="/calendrier">Calendrier</NavLink></li>
        <li><NavLink to="/reglages">Réglages</NavLink></li>
      </ul>

      <p className="titre-section">Catégories</p>
      <CategoryNav />
    </nav>
  )
}
