import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    "Variables Supabase manquantes. Copie .env.example en .env.local, " +
    "puis renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."
  )
}

/**
 * LE client Supabase de l'application — créé une seule fois, ici.
 *
 * Ne recrée jamais un client ailleurs avec createClient() : tu te retrouverais
 * avec plusieurs sessions concurrentes et des déconnexions inexpliquées.
 * C'est l'erreur la plus fréquente sur ce type de projet.
 */
export const supabase = createClient(url, anonKey)
