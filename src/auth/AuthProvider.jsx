import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Détient la session courante et l'expose à toute l'application.
 * Aucun autre fichier ne doit appeler supabase.auth.* directement.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivant = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setSession(data.session)
      setLoading(false)
    })

    // Reconnexion, déconnexion, rafraîchissement du jeton, autre onglet…
    const { data: écouteur } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      vivant = false
      écouteur.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,

    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),

    // `display_name` atterrit dans raw_user_meta_data, que le trigger
    // handle_new_user() (migration 0003) recopie dans public.profiles.
    signUp: (email, password, displayName) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      }),

    signOut: () => supabase.auth.signOut(),
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() doit être appelé à l\'intérieur d\'un <AuthProvider>')
  return ctx
}
