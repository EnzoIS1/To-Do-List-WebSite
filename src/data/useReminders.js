import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { today } from '../lib/dates'

/**
 * Rappels « dans le site » (v1).
 *
 * Il n'y a pas de tâche planifiée côté serveur en v1 : au chargement, on
 * demande les rappels dont la date est arrivée et qui n'ont pas encore été
 * vus. C'est ce qui alimente le badge de l'en-tête.
 *
 * Le passage aux e-mails (v2) ne changera rien ici : il ajoutera une tâche
 * Supabase Cron qui lira les mêmes lignes avec channel = 'email'.
 */
export function useReminders() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  const recharger = useCallback(async () => {
    if (!user) { setReminders([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reminders')
      .select('*, tasks(id, title, due_date, is_done)')
      .eq('channel', 'in_app')
      .is('seen_at', null)
      .lte('remind_on', today())
      .order('remind_on', { ascending: true })
    // On ignore les rappels dont la tâche a été cochée entre-temps.
    setReminders((data ?? []).filter((r) => r.tasks && !r.tasks.is_done))
    setLoading(false)
  }, [user])

  useEffect(() => { recharger() }, [recharger])

  const creer = useCallback(async ({ taskId, remindOn }) => {
    const { data, error } = await supabase
      .from('reminders')
      .insert({ user_id: user.id, task_id: taskId, remind_on: remindOn })
      .select().single()
    return { data, error }
  }, [user])

  const marquerVu = useCallback(async (id) => {
    const { error } = await supabase
      .from('reminders').update({ seen_at: new Date().toISOString() }).eq('id', id)
    if (!error) setReminders((r) => r.filter((x) => x.id !== id))
    return { error }
  }, [])

  return { reminders, loading, recharger, creer, marquerVu }
}
