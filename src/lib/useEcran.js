import { useEffect, useState } from 'react'

/** Au-dessous de cette largeur, on bascule sur la mise en page téléphone. */
const SEUIL = 900

/**
 * Vrai quand l'écran est étroit. On écoute matchMedia plutôt que la largeur
 * de la fenêtre : le navigateur ne prévient qu'au franchissement du seuil,
 * au lieu de déclencher un rendu à chaque pixel de redimensionnement.
 */
export function useEstTelephone() {
  const [etroit, setEtroit] = useState(() => {
    try { return window.matchMedia(`(max-width: ${SEUIL - 1}px)`).matches } catch { return false }
  })

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SEUIL - 1}px)`)
    const suivre = (e) => setEtroit(e.matches)
    mq.addEventListener('change', suivre)
    setEtroit(mq.matches)
    return () => mq.removeEventListener('change', suivre)
  }, [])

  return etroit
}
