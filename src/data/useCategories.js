import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

/**
 * Charge les catégories à plat, et les recompose en arbre à deux niveaux
 * grâce à parent_id : « Études » → « Devoirs », « Rendus »…
 */
export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const recharger = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('categories').select('*')
      .order('position', { ascending: true })
      .order('name', { ascending: true })
    setError(error)
    setCategories(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { recharger() }, [recharger])

  const arbre = useMemo(() => {
    const racines = categories.filter((c) => !c.parent_id)
    return racines.map((r) => ({
      ...r,
      enfants: categories.filter((c) => c.parent_id === r.id),
    }))
  }, [categories])

  const creer = useCallback(async (champs) => {
    const { data, error } = await supabase
      .from('categories').insert({ ...champs, user_id: user.id }).select().single()
    if (!error) setCategories((c) => [...c, data])
    return { data, error }
  }, [user])

  const supprimer = useCallback(async (id) => {
    // Les tâches ne sont pas supprimées : la clé étrangère est en
    // `on delete set null`, elles se retrouvent simplement sans catégorie.
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) setCategories((c) => c.filter((x) => x.id !== id))
    return { error }
  }, [])

  return { categories, arbre, loading, error, recharger, creer, supprimer }
}
