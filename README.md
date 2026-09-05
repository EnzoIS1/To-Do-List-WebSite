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
supabase/migrations/0004_revision_rappels.sql   -- les colonnes des révisions
supabase/migrations/0005_notifications.sql      -- les notifications groupées
supabase/migrations/0006_rappels_automatiques.sql -- le rappel de la veille
```

`0004` et `0006` peuvent être relancées sans risque : les colonnes sont en
`add column if not exists`, et les rappels du rattrapage en
`on conflict do nothing`.

`0006` pose une règle qui vaut pour tout le site : **une tâche datée et non
faite se rappelle toute seule la veille**, et une séance de révision le jour
même. C'est un trigger PostgreSQL et non du code côté site, pour que la règle
tienne quelle que soit la façon dont la tâche est arrivée en base.

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
| `npm run test:revision` | teste le calcul des révisions espacées |
| `npm run test:sw` | teste le service worker des notifications |
| `npm run test:tri` | teste l'ordre d'affichage des tâches |
| `npm run test:fonction` | lance la fonction serveur dans Deno et vérifie CORS + secrets |
| `node outils/cles-vapid.mjs` | génère la paire de clés des notifications |

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

## Les notifications du matin

Un seul message par jour, à l'heure choisie, qui **regroupe tous les rappels
dus**. Jamais une notification par tâche.

### Comment ça marche

`pg_cron` réveille une fonction Supabase toutes les heures. Elle demande à
PostgreSQL qui doit recevoir son résumé *maintenant* — c'est la fonction SQL
`resumes_a_envoyer()` qui porte toute la logique de fuseau horaire et de
dédoublonnage — puis elle chiffre et envoie un message par appareil abonné.
Le service worker `public/sw.js` l'affiche, toujours avec la même étiquette :
une nouvelle notification **remplace** la précédente au lieu de s'empiler.

Rien de payant nulle part : les notifications web passent par le service
d'Apple ou de Google avec des clés qu'on génère soi-même, sans compte ni
abonnement.

### Installation, dans l'ordre

**1. La migration.** Dans Supabase → SQL Editor, lancer
`supabase/migrations/0005_notifications.sql`.

**2. Les clés.** Sur ta machine :

```
node outils/cles-vapid.mjs
```

Suivre exactement ce qu'il affiche. La clé privée ne va QUE dans les secrets
Supabase — jamais dans `.env.local`, jamais sur GitHub.

**3. La clé publique côté site.** Dans `.env.local` pour le développement, et
dans GitHub → Settings → Secrets and variables → Actions → **Variables** pour
la production. Puis ajouter la ligne au workflow, sous les deux autres :

```yaml
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
          VITE_VAPID_PUBLIQUE: ${{ vars.VITE_VAPID_PUBLIQUE }}
```

**4. Les secrets de la fonction.** Supabase → Edge Functions → Secrets :

| Nom | Valeur |
| --- | --- |
| `VAPID_PUBLIQUE` | la clé publique |
| `VAPID_PRIVEE` | la clé privée |
| `SUJET_VAPID` | `mailto:` suivi de ton adresse e-mail |
| `LIEN_SITE` | `https://enzois1.github.io/To-Do-List-WebSite/` |
| `CLE_PLANIFICATEUR` | une longue chaîne au hasard, inventée par toi |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement.

**5. Déployer la fonction.**

```
npx supabase functions deploy envoyer-rappels --no-verify-jwt
```

`--no-verify-jwt` est volontaire : la fonction fait ses propres contrôles —
la clé du planificateur, ou un jeton de connexion valide — plutôt que de
s'en remettre à un réglage invisible.

**6. La tâche planifiée.** Dans SQL Editor, en remplaçant les deux valeurs :

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'resume-des-rappels',
  '0 * * * *',                      -- au début de chaque heure
  $$
  select net.http_post(
    url := 'https://TON-PROJET.supabase.co/functions/v1/envoyer-rappels',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cle-planificateur', 'LA-CLE-QUE-TU-AS-INVENTEE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
```

Pour vérifier : `select * from cron.job;`

**7. Sur l'iPhone.** Ouvrir le site dans Safari, **Partager → « Sur l'écran
d'accueil »**, puis rouvrir le site **depuis cette icône**. Paramètres →
Notifications → Activer. C'est une règle d'Apple : dans un onglet Safari,
les notifications web n'existent pas.

**8. Vérifier.** Paramètres → Notifications → « Envoyer un essai ».

### Savoir où ça bloque

Paramètres → Notifications affiche l'état de **chaque maillon** de la chaîne :
navigateur compatible, clé publique compilée dans le site, site installé sur
l'écran d'accueil (iPhone seulement), autorisation accordée, appareil
enregistré côté serveur. Le premier rouge en partant du haut est celui à
régler ; les suivants en découlent.

Deux essais séparés, et l'ordre compte :

- **Essai 1 — l'affichage** ne sort pas de l'appareil. Il vérifie
  l'autorisation et le service worker, sans toucher au serveur.
- **Essai 2 — la chaîne complète** passe par la fonction serveur, le
  chiffrement et le service de notification.

Si le 1 marche et pas le 2, le problème est côté serveur : fonction non
déployée, secret manquant, ou refus du service de notification. Si le 1 ne
marche pas, inutile de chercher plus loin.

**« Failed to fetch » sur l'essai 2** veut dire que la requête n'a jamais
abouti — le navigateur n'a même pas obtenu de réponse. Trois causes, dans
l'ordre de probabilité :

1. **La fonction n'est pas déployée.**
   `npx supabase functions deploy envoyer-rappels --no-verify-jwt`
2. **Elle est déployée mais ne renvoie pas les en-têtes CORS.** La requête
   d'essai part du site vers une autre origine et porte un en-tête
   `Authorization` : le navigateur envoie d'abord une requête `OPTIONS` de
   contrôle préalable et bloque tout si la réponse ne l'autorise pas
   explicitement. Pour le vérifier sans navigateur : `npm run test:fonction`.
3. **`VITE_SUPABASE_URL` est erronée** dans le site compilé.

**« 403 invalid JWT » / « BadJwtToken »** veut dire que la fonction a bien
envoyé, et que c'est le service de notification qui refuse la signature. Une
seule cause en pratique : **l'appareil s'est abonné avec une autre clé
publique que celle qui signe aujourd'hui**. Un abonnement est lié à vie à la
clé passée au moment de s'abonner ; regénérer les clés VAPID rend donc muets
tous les abonnements existants, sans que rien ne le signale.

Le remède est sur l'appareil concerné : Paramètres → Notifications →
**« Réabonner »**. Le site détecte aussi le cas tout seul à l'ouverture, quand
le navigateur expose la clé d'origine — Safari ne le fait pas toujours, d'où
le bouton.

Vérifie au passage que les trois valeurs viennent bien de la **même**
génération de clés : `VITE_VAPID_PUBLIQUE` (variable GitHub Actions),
`VAPID_PUBLIQUE` et `VAPID_PRIVEE` (secrets Supabase).

**Un message qui nomme un secret** (« VAPID_PUBLIQUE : absent des secrets de
la fonction ») veut dire que la fonction tourne et répond — il ne reste qu'à
renseigner ce secret dans Supabase → Edge Functions → Secrets, puis à
redéployer. La fonction contrôle aussi la FORME des deux clés VAPID : elles
font 87 et 43 caractères, donc les avoir interverties est détecté et signalé
comme tel.

### Quand ça ne marchera pas

Trois causes, dans l'ordre de probabilité :

- **L'icône de l'écran d'accueil a été supprimée.** L'abonnement meurt avec
  elle. Il faut réinstaller et réactiver.
- **Le projet Supabase s'est mis en pause.** Le plan gratuit endort un
  projet qui ne reçoit pas d'activité pendant une semaine. Un projet endormi
  n'exécute aucune tâche planifiée.
- **L'abonnement a expiré.** Le site s'en occupe seul à chaque ouverture,
  mais il faut donc ouvrir le site de temps en temps.

Dans tous les cas, Paramètres → Notifications affiche la date du **dernier
envoi**. Si elle date de trois semaines, le système s'est tu — c'est
exactement pour ça que cette ligne existe.

## Ce qui n'est pas dans la v1

Listes partagées, rappels par e-mail, tâches récurrentes, pièces jointes.
Le schéma prévoit déjà chacun de ces cas (`user_id` partout,
`reminders.channel`, `tasks.recurrence_rule`) pour que l'ajout ne demande pas
de migration lourde.
