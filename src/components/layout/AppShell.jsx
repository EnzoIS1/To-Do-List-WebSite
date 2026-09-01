import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useReminders } from '../../data/useReminders'
import { useAuth } from '../../auth/AuthProvider'

export default function AppShell() {
  const { reminders, marquerVu } = useReminders()
  const { signOut } = useAuth()

  return (
    <div className="coque">
      <Sidebar />

      <div className="colonne-principale">
        <header className="barre-haute">
          {reminders.length > 0 && (
            <div className="rappels" role="status">
              <strong>{reminders.length}</strong>{' '}
              {reminders.length > 1 ? 'rappels' : 'rappel'} :{' '}
              {reminders.map((r) => (
                <button key={r.id} className="puce-rappel" onClick={() => marquerVu(r.id)}>
                  {r.tasks.title} ✕
                </button>
              ))}
            </div>
          )}
          <button className="lien" onClick={signOut}>Se déconnecter</button>
        </header>

        <main className="contenu">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
