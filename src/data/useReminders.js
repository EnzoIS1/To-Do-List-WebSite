import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { today } from '../lib/dates'

/**
 * Rappels « dans le site ».
 *
 * Il n'y a pas de tâche planifiée côté serveur : au chargement, on demande
 * TOUS les rappels du compte — passés et à venir. C'est volontaire et ça
 * reste léger : un rappel pèse une cinquantaine d'octets et il y en a au
 * plus quelques dizaines à la fois. En échange, le menu d'une tâche peut
 * afficher ses rappels sans une requête de plus à chaque ouverture.
 *
 * Les rappels dont le jour est arrivé alimentent le bandeau ; les autres
 * attendent. Le jour de comparaison est calculé en heure locale (today()),
 * jamais avec toISOString() — voir l'avertissement de lib/dates.js.
 *
 * Le passage aux e-mails plus tard ne changera rien ici : il ajoutera une
 * tâche planifiée Supabase qui lira les mêmes lignes avec channel = 'email'.
 */
export function useReminders() {
  const { user } = useAuth()
  const [rappels, setRappels] = useState([])
  const [loading, setLoading] = useState(true)

  const recharger = useCallback(async () => {
    if (!user) { setRappels([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('channel', 'in_app')
      .order('remind_on', { ascending: true })
    setRappels(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { recharger() }, [recharger])

  const creer = useCallback(async ({ taskId, remindOn }) => {
    // Deux rappels le même jour pour la même tâche n'apportent rien.
    const existe = rappels.some((r) => r.task_id === taskId && r.remind_on === remindOn)
    if (existe) return { data: null, error: null }

    const { data, error } = await supabase
      .from('reminders')
      .insert({ user_id: user.id, task_id: taskId, remind_on: remindOn })
      .select().single()
    if (!error && data) setRappels((r) => [...r, data])
    return { data, error }
  }, [user, rappels])

  const supprimer = useCallback(async (id) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (!error) setRappels((r) => r.filter((x) => x.id !== id))
    return { error }
  }, [])

  const marquerVu = useCallback(async (id) => {
    const vu = new Date().toISOString()
    const { error } = await supabase.from('reminders').update({ seen_at: vu }).eq('id', id)
    if (!error) setRappels((r) => r.map((x) => (x.id === id ? { ...x, seen_at: vu } : x)))
    return { error }
  }, [])

  /** Les rappels arrivés à échéance et pas encore écartés. */
  const echus = useMemo(() => {
    const jour = today()
    return rappels.filter((r) => !r.seen_at && r.remind_on <= jour)
  }, [rappels])

  const rappelsDe = useCallback(
    (taskId) => rappels.filter((r) => r.task_id === taskId),
    [rappels]
  )

  return {
    rappels, rappelsEchus: echus, rappelsDe,
    rappelsLoading: loading, rechargerRappels: recharger,
    creerRappel: creer, supprimerRappel: supprimer, marquerRappelVu: marquerVu,
  }
}
