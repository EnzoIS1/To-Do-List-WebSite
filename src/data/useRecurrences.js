import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

/**
 * Les récurrences : les modèles, pas les tâches qu'ils produisent.
 *
 * Ce module ne fabrique rien. Il lit, crée, modifie et supprime des
 * règles, et il sait AVANCER LE CURSEUR. La fabrication elle-même est
 * dans DonneesProvider, parce qu'elle a besoin des deux côtés à la fois :
 * les règles ici, la création de tâches dans useTasks.
 *
 * L'ordre des deux écritures compte, et c'est le seul point délicat :
 * on crée les tâches D'ABORD, on avance le curseur ENSUITE. Si le réseau
 * tombe entre les deux, on aura au pire des tâches créées deux fois à la
 * prochaine ouverture — visible, et corrigeable d'un clic. Dans l'autre
 * ordre, on aurait des occurrences définitivement perdues, sans que rien
 * ne le signale. Entre un doublon qu'on voit et un oubli qu'on ne voit
 * pas, le doublon est toujours le bon choix.
 */
export function useRecurrences() {
  const { user } = useAuth()
  const [recurrences, setRecurrences] = useState([])
  const [loading, setLoading] = useState(true)

  const recharger = useCallback(async () => {
    if (!user) { setRecurrences([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('recurrences')
      .select('*')
      .order('created_at', { ascending: true })
    setRecurrences(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { recharger() }, [recharger])

  const creer = useCallback(async (champs) => {
    const { data, error } = await supabase
      .from('recurrences')
      .insert({ ...champs, user_id: user.id })
      .select().single()
    if (!error && data) setRecurrences((r) => [...r, data])
    return { data, error }
  }, [user])

  const modifier = useCallback(async (id, champs) => {
    const { data, error } = await supabase
      .from('recurrences').update(champs).eq('id', id).select().single()
    if (!error && data) setRecurrences((r) => r.map((x) => (x.id === id ? data : x)))
    return { data, error }
  }, [])

  const supprimer = useCallback(async (id) => {
    const { error } = await supabase.from('recurrences').delete().eq('id', id)
    if (!error) setRecurrences((r) => r.filter((x) => x.id !== id))
    return { error }
  }, [])

  /** Le curseur avance, et la règle s'éteint si elle a atteint sa fin. */
  const avancerCurseur = useCallback(
    (id, prochaine, termine) => modifier(id, termine ? { prochaine, actif: false } : { prochaine }),
    [modifier]
  )

  const recurrenceDe = useCallback(
    (id) => recurrences.find((r) => r.id === id) ?? null,
    [recurrences]
  )

  return {
    recurrences,
    recurrencesLoading: loading,
    rechargerRecurrences: recharger,
    creerRecurrence: creer,
    modifierRecurrence: modifier,
    supprimerRecurrence: supprimer,
    avancerCurseur,
    recurrenceDe,
  }
}
