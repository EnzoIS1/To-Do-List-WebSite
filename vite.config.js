import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ Piège n°1 du document d'architecture.
//
// Un site publié sur https://<pseudo>.github.io/<dépôt>/ n'est PAS à la racine
// du domaine. Si `base` ne vaut pas '/<dépôt>/', les fichiers CSS et JS sont
// demandés à la racine, ne sont pas trouvés, et la page reste blanche.
//
// Renseigné avec le nom exact du dépôt : EnzoIS1/To-Do-List-WebSite
// Référence : https://vite.dev/guide/static-deploy
export default defineConfig({
  plugins: [react()],
  base: '/To-Do-List-WebSite/',
})
