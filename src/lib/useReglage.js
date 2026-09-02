import { useCallback, useEffect, useState } from 'react'

/**
 * Un réglage retenu sur cet appareil, dans le stockage du navigateur.
 *
 * Sert au thème, à la couleur d'accent, au délai d'archivage et à la
 * disposition du tableau de bord. Toutes les lectures et écritures sont
 * protégées : en navigation privée le stockage peut être refusé, et le site
 * doit continuer de fonctionner avec la valeur par défaut.
 */
export function useReglage(cle, defaut) {
  const [valeur, setValeurInterne] = useState(() => {
    try {
      const brut = window.localStorage.getItem(cle)
      return brut === null ? defaut : JSON.parse(brut)
    } catch {
      return defaut
    }
  })

  const setValeur = useCallback((v) => {
    setValeurInterne(v)
    try {
      if (v === null || v === undefined) window.localStorage.removeItem(cle)
      else window.localStorage.setItem(cle, JSON.stringify(v))
    } catch { /* stockage refusé : le réglage ne vaut que pour cette session */ }
  }, [cle])

  const reinitialiser = useCallback(() => {
    setValeurInterne(defaut)
    try { window.localStorage.removeItem(cle) } catch { /* ignoré */ }
  }, [cle, defaut])

  return [valeur, setValeur, reinitialiser]
}

/** Les délais proposés pour faire disparaître les tâches terminées. */
export const DELAIS_ARCHIVAGE = [
  { id: 'jamais', nom: 'Jamais', jours: null, aide: 'Tout reste affiché.' },
  { id: 'semaine', nom: '1 semaine', jours: 7, aide: 'Le plus propre au quotidien.' },
  { id: 'mois', nom: '1 mois', jours: 30, aide: 'Un bon compromis.' },
  { id: 'an', nom: '1 an', jours: 365, aide: 'Tu gardes une longue trace.' },
]

/** Le nombre de jours associé à un identifiant de délai, ou null. */
export function joursDArchivage(id) {
  return DELAIS_ARCHIVAGE.find((d) => d.id === id)?.jours ?? null
}
