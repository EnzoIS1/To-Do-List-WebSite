/**
 * Génère la paire de clés des notifications (VAPID).
 *
 *   node outils/cles-vapid.mjs
 *
 * À lancer UNE SEULE FOIS, sur ta machine. Je ne les génère pas à ta place
 * exprès : la clé privée ne doit jamais transiter par une conversation, un
 * dépôt ou un fichier partagé. Elle sort de ton ordinateur, va directement
 * dans les secrets de Supabase, et nulle part ailleurs.
 *
 * Si tu la perds, ce n'est pas dramatique : tu en refais une paire. Mais
 * tous les appareils déjà abonnés devront réactiver les notifications, car
 * un abonnement est lié à la clé publique avec laquelle il a été créé.
 */
import { webcrypto } from 'node:crypto'
import { genererClesVapid } from '../supabase/functions/envoyer-rappels/webpush.js'

if (!globalThis.crypto) globalThis.crypto = webcrypto

const { publique, privee } = await genererClesVapid()

console.log(`
┌──────────────────────────────────────────────────────────────────────┐
│  Tes clés de notification. Range-les tout de suite.                  │
└──────────────────────────────────────────────────────────────────────┘

CLÉ PUBLIQUE  — elle part dans le site compilé, elle est publique par
                conception, exactement comme la clé anon de Supabase.

  ${publique}

  → dans .env.local :        VITE_VAPID_PUBLIQUE=${publique}
  → dans GitHub :            Settings → Secrets and variables → Actions
                             → Variables → New variable
                             Nom : VITE_VAPID_PUBLIQUE
  → dans Supabase :          Edge Functions → Secrets → VAPID_PUBLIQUE


CLÉ PRIVÉE    — ⚠️  SECRÈTE. Jamais dans .env.local, jamais sur GitHub,
                jamais dans un message. Uniquement dans Supabase.

  ${privee}

  → dans Supabase :          Edge Functions → Secrets → VAPID_PRIVEE

Ferme ce terminal quand c'est fait.
`)
