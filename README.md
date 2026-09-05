# Site To Do List

To Do List personnelle avec calendrier par jours, catégories (études, vie perso,
courses) et rappels. Site statique React + Vite, données et comptes sur Supabase,
hébergement GitHub Pages.

Le document d'architecture complet — arbitrages de conception, schéma commenté,
pièges de déploiement — est publié à part. Ce fichier ne contient que la marche
à suivre.

## Mise en route

### 1. Le projet Supabase

Crée un projet sur supabase.com, en région européenne pour la latence.
Puis, dans **SQL Editor**, exécute les migrations **dans l'ordre** :

```
supabase/migrations/0001_schema.sql     -- les tables et les index
supabase/migrations/0002_rls.sql        -- le cloisonnement des comptes
supabase/migrations/0003_triggers.sql   -- profil auto, updated_at, completed_at
supabase/migrations/0004_revision_rappels.sql  -- les colonnes des révisions
```

`0004` peut être relancée sans risque : chaque instruction est en
`add column if not exists`.

Après `0002`, le tableau de bord ne doit plus signaler aucune table du schéma
`public` sans sécurité activée.

### 2. Les variables d'environnement

```bash
cp .env.example .env.local
```

Renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, tous deux dans
Supabase → Project Settings → API.

`.env.local` est déjà dans `.gitignore`. La clé `anon` est publique par
conception ; la clé `service_role` ne doit jamais figurer ici.

### 3. Lancer le site

Il faut Node.js installé (npm est livré avec). La version LTS suffit ;
`@supabase/supabase-js` exige Node 22 minimum.

```bash
npm install
npm run dev
```

**Sous Windows, si PowerShell refuse :** `npm.ps1 ... l'exécution de scripts est
désactivée sur ce système`. La commande `npm` passe par un script PowerShell que
la stratégie d'exécution de la machine bloque. Deux issues :

- sans rien modifier, utiliser `npm.cmd install` et `npm.cmd run dev`, ou passer
  le terminal de VS Code en « Command Prompt » ;
- ou autoriser durablement les scripts locaux pour ton seul compte :
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

Vite affiche une adresse du type `http://localhost:5173/site-todo/` — ouvre
celle-là, avec le chemin complet, pas la racine du serveur.

> **N'ouvre pas `index.html` avec Live Server, ni en double-cliquant dessus.**
> Ce n'est pas une page HTML autonome. Le navigateur ne sait pas lire les
> fichiers `.jsx` : il s'arrête sur la première balise JSX (`Unexpected token '<'`)
> ou refuse le fichier pour cause de type MIME, et la page reste blanche.
> C'est `npm run dev` qui lance Vite, lequel traduit le JSX à la volée.

Crée ton compte depuis l'écran de connexion. Le trigger `handle_new_user()`
crée automatiquement la ligne correspondante dans `profiles`.

### 4. Les catégories de départ

Ouvre `supabase/seed.sql`, remplace l'identifiant en haut du fichier par le tien
(Supabase → Authentication → Users), et exécute-le.

### 5. Vérifier le cloisonnement — ne saute pas cette étape

Crée un deuxième compte, connecte-toi avec, et essaie de lire une tâche du
premier compte en ciblant explicitement son identifiant. La réponse doit être
vide. Tant que ce test n'a pas été fait chez toi, le cloisonnement n'est
qu'une intention.

## Déploiement

1. Dans `vite.config.js`, remplace `base: '/site-todo/'` par le nom exact de ton
   dépôt GitHub. Sans ça, la page publiée reste blanche.
2. Sur GitHub : **Settings → Pages → Source → GitHub Actions**.
3. Sur GitHub : **Settings → Secrets and variables → Actions → Variables**,
   ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. Pousse sur `main`. Le workflow `.github/workflows/deploy.yml` fait le reste.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | compilation dans `dist/` |
| `npm run preview` | prévisualise la compilation |
| `npm run test:dates` | teste les utilitaires de dates |

## Comment le code est rangé

Par rôle, pas par écran.

- `src/lib/` — le client Supabase (créé **une seule fois**) et les dates.
- `src/auth/` — la session et les écrans de connexion.
- `src/data/` — **la seule frontière avec Supabase**. Aucun composant
  d'affichage n'appelle la base directement : il passe par un hook d'ici.
- `src/components/` — l'affichage, découpé par domaine.
- `src/pages/` — l'assemblage, une page par route.
- `supabase/` — les migrations, versionnées comme le reste du code.

Deux règles à ne pas contourner : ne jamais recréer un client Supabase ailleurs
que dans `lib/supabase.js`, et ne jamais fabriquer une date avec
`toISOString()` — tout passe par `lib/dates.js`.

## Ce qui n'est pas dans la v1

Listes partagées, rappels par e-mail, notifications navigateur fermé, tâches
récurrentes, pièces jointes. Le schéma prévoit déjà chacun de ces cas
(`user_id` partout, `reminders.channel`, `tasks.recurrence_rule`) pour que
l'ajout ne demande pas de migration lourde.
