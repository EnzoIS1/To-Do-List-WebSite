import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

/**
 * Seule frontière avec Supabase pour les tâches.
 * Aucun composant d'affichage ne doit appeler supabase.from('tasks').
 *
 * Remarque : on ne filtre JAMAIS sur user_id dans les lectures.
 * C'est inutile — la RLS le fait déjà, côté base — et le faire ici
 * laisserait croire que la sécurité dépend du front.
 * En écriture en revanche, user_id doit être renseigné : la policy
 * `with check` de la migration 0002 refuse toute ligne créée pour autrui.
 *
 * @param {object} filtres
 * @param {string} [filtres.dueOn]      un jour précis, 'AAAA-MM-JJ'
 * @param {string} [filtres.dueBefore]  jusqu'à ce jour inclus
 * @param {string} [filtres.categoryId]
 * @param {boolean} [filtres.includeDone=false]
 */
export function useTasks(filtres = {}) {
  const { dueOn, dueBefore, categoryId, includeDone = false, archiveApresJours = null } = filtres
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const recharger = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return }
    setLoading(true)

    let requete = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (!includeDone) requete = requete.eq('is_done', false)

    /*
     * Archivage : une tâche terminée depuis plus longtemps que le délai
     * choisi n'est plus demandée du tout. Rien n'est supprimé — la ligne
     * reste en base et réapparaît si le délai est rallongé. C'est un filtre
     * de lecture, pas un effacement, et il allège la réponse du serveur.
     */
    if (archiveApresJours) {
      const seuil = new Date()
      seuil.setDate(seuil.getDate() - archiveApresJours)
      requete = requete.or(`is_done.eq.false,completed_at.gte.${seuil.toISOString()}`)
    }
    if (dueOn) requete = requete.eq('due_date', dueOn)
    if (dueBefore) requete = requete.lte('due_date', dueBefore)
    if (categoryId) requete = requete.eq('category_id', categoryId)

    const { data, error } = await requete
    setError(error)
    setTasks(data ?? [])
    setLoading(false)
  }, [user, dueOn, dueBefore, categoryId, includeDone, archiveApresJours])

  useEffect(() => { recharger() }, [recharger])

  const creer = useCallback(async (champs) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...champs, user_id: user.id })   // obligatoire : voir la policy with check
      .select()
      .single()
    if (!error) setTasks((t) => [...t, data])
    return { data, error }
  }, [user])

  /**
   * Crée plusieurs tâches d'un coup — utilisé par les révisions, qui
   * arrivent par séries de trois à sept. Un seul aller-retour réseau au
   * lieu de sept, et surtout : soit la série entière est créée, soit rien,
   * ce qui évite les plannings de révision à moitié écrits.
   */
  const creerPlusieurs = useCallback(async (liste) => {
    if (liste.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('tasks')
      .insert(liste.map((champs) => ({ ...champs, user_id: user.id })))
      .select()
    if (!error) setTasks((t) => [...t, ...(data ?? [])])
    return { data, error }
  }, [user])

  const modifier = useCallback(async (id, champs) => {
    const { data, error } = await supabase
      .from('tasks').update(champs).eq('id', id).select().single()
    if (!error) setTasks((t) => t.map((x) => (x.id === id ? data : x)))
    return { data, error }
  }, [])

  // completed_at est renseigné par un trigger : on ne touche qu'à is_done.
  const cocher = useCallback((tache) => modifier(tache.id, { is_done: !tache.is_done }), [modifier])

  const supprimer = useCallback(async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks((t) => t.filter((x) => x.id !== id))
    return { error }
  }, [])

  const supprimerPlusieurs = useCallback(async (ids) => {
    if (ids.length === 0) return { error: null }
    const { error } = await supabase.from('tasks').delete().in('id', ids)
    if (!error) setTasks((t) => t.filter((x) => !ids.includes(x.id)))
    return { error }
  }, [])

  return {
    tasks, loading, error, recharger,
    creer, creerPlusieurs, modifier, cocher, supprimer, supprimerPlusieurs,
  }
}
