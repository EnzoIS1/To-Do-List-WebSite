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

/**
 * La politique de sécurité du contenu (CSP), injectée à la compilation.
 *
 * ─────────────────────────────────────────────────────────────────────
 * À QUOI ELLE SERT ICI
 *
 * Le jeton de session Supabase vit dans le stockage du navigateur. Si du
 * code étranger arrivait un jour à s'exécuter dans la page — une faille
 * dans une dépendance, une injection dans un champ mal échappé — il
 * pourrait le lire et le renvoyer ailleurs. La CSP coupe les deux bouts
 * de cette chaîne : aucun script qui ne vienne du site lui-même, et
 * aucune connexion vers un serveur qui ne soit Supabase.
 *
 * POURQUOI UNE BALISE ET NON UN EN-TÊTE
 *
 * GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP. La balise
 * <meta> fait l'essentiel du travail, avec une limite qu'il faut
 * connaître : `frame-ancestors` (la protection contre l'affichage du
 * site dans une iframe d'un autre site) N'EST PAS prise en compte dans
 * une balise. Elle est laissée ci-dessous pour le jour où le site sera
 * servi par un hébergeur qui envoie des en-têtes, mais elle ne protège
 * rien aujourd'hui — le dire est plus utile que de faire croire.
 *
 * POURQUOI SEULEMENT À LA COMPILATION
 *
 * En développement, Vite injecte lui-même des scripts en ligne (le
 * rafraîchissement à chaud). Une CSP stricte casserait `npm run dev`
 * sans rien protéger : le serveur de développement n'est pas exposé.
 * ─────────────────────────────────────────────────────────────────────
 */
const REGLES = [
  "default-src 'self'",
  // Aucun script en ligne : c'est pour ça que le script du thème est un
  // fichier dans public/ plutôt qu'un bloc dans index.html.
  "script-src 'self'",
  // `unsafe-inline` est inévitable pour les styles : React pose des
  // styles en ligne (les couleurs de catégorie, la largeur des barres de
  // progression). Un style injecté ne peut pas exécuter de code dans un
  // navigateur moderne — le risque résiduel est l'habillage, pas le vol.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Les polices sont embarquées, la base est chez Supabase : rien d'autre
  // n'a de raison d'être joint. `wss:` sert aux abonnements temps réel.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Sans effet dans une balise <meta> — voir le commentaire ci-dessus.
  "frame-ancestors 'none'",
].join('; ')

const politiqueDeSecurite = () => ({
  name: 'politique-de-securite',
  apply: 'build',
  transformIndexHtml: (html) => ({
    html,
    tags: [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: REGLES },
      injectTo: 'head-prepend',
    }],
  }),
})

export default defineConfig({
  plugins: [react(), politiqueDeSecurite()],
  base: '/To-Do-List-WebSite/',
})
