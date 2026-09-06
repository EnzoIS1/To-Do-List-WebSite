import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
// Après global.css : les ambiances ne font que redéfinir des variables et
// surcharger quelques surfaces, elles doivent donc avoir le dernier mot.
import './styles/ambiances.css'

const racine = document.getElementById('root')

/**
 * App est importé dynamiquement pour une raison précise : lib/supabase.js lève
 * une erreur à l'évaluation du module si les variables d'environnement manquent.
 * Avec un import statique, cette erreur se produirait AVANT que ce fichier ne
 * s'exécute, et laisserait une page blanche sans explication. Ici, on la
 * rattrape et on affiche ce qu'il faut faire.
 */
import('./App')
  .then(({ default: App }) => {
    ReactDOM.createRoot(racine).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((erreur) => {
    console.error(erreur)
    racine.replaceChildren()

    const bloc = document.createElement('div')
    bloc.style.cssText =
      'max-width:34rem;margin:12vh auto;padding:0 1.5rem;font-family:var(--police,system-ui,sans-serif)'

    const titre = document.createElement('h1')
    titre.textContent = 'Configuration incomplète'
    titre.style.fontSize = '1.25rem'

    const message = document.createElement('p')
    message.textContent = erreur?.message ?? String(erreur)

    const aide = document.createElement('p')
    aide.textContent =
      "Copie .env.example en .env.local, renseigne les deux valeurs (Supabase → " +
      "Project Settings → API), puis relance npm run dev : Vite ne relit pas les " +
      "fichiers d'environnement à chaud."

    bloc.append(titre, message, aide)
    racine.append(bloc)
  })
