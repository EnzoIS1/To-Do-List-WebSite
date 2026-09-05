import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

/**
 * Le profil : les réglages qui doivent vivre en BASE et non dans le navigateur.
 *
 * Le thème ou la disposition du tableau de bord sont propres à un appareil :
 * localStorage suffit. L'heure du résumé, non — c'est le serveur qui en a
 * besoin, à 7 h du matin, alors qu'aucun navigateur n'est ouvert. Un réglage
 * que seul ton téléphone connaîtrait ne servirait à rien.
 */
export function useProfil() {
  const { user } = useAuth()
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)

  const recharger = useCallback(async () => {
    if (!user) { setProfil(null); setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, resume_actif, heure_resume, fuseau')
      .eq('id', user.id)
      .maybeSingle()
    setProfil(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { recharger() }, [recharger])

  const modifier = useCallback(async (champs) => {
    if (!user) return { error: { message: 'Non connecté.' } }
    // Mise à jour optimiste : le sélecteur d'heure doit répondre tout de
    // suite, pas après un aller-retour réseau.
    setProfil((p) => (p ? { ...p, ...champs } : p))
    const { data, error } = await supabase
      .from('profiles').update(champs).eq('id', user.id).select().single()
    if (error) recharger()          // on revient à la vérité de la base
    else setProfil(data)
    return { error }
  }, [user, recharger])

  /**
   * Le fuseau du navigateur. On le renseigne une fois, sans rien demander :
   * personne n'a envie de choisir « Europe/Paris » dans une liste de 400
   * entrées, et le navigateur connaît déjà la réponse.
   */
  useEffect(() => {
    if (!profil || !user) return
    const detecte = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detecte && detecte !== profil.fuseau) modifier({ fuseau: detecte })
    // On ne suit que l'identifiant : sinon cet effet se relancerait à chaque
    // rendu et réécrirait la ligne en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil?.id])

  return { profil, loading, modifier, recharger }
}
