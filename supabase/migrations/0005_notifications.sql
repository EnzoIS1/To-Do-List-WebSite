-- ════════════════════════════════════════════════════════════════════
-- 0005 — Notifications groupées sur le téléphone
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0004.
-- Cette migration ne crée que les tables et la requête de sélection.
-- La planification (pg_cron) est à la fin du README : elle demande la
-- référence de ton projet, qui n'a rien à faire dans un fichier versionné.
--
-- Principe : UN SEUL message par jour et par personne, qui regroupe tous
-- les rappels dus. Pas un message par rappel — c'est ce qu'Enzo a demandé,
-- et c'est aussi ce qui divise le trafic par le nombre de rappels.
-- ════════════════════════════════════════════════════════════════════

-- ── Les abonnements aux notifications ───────────────────────────────
-- Une ligne par navigateur autorisé. Le même compte peut en avoir
-- plusieurs : l'iPhone et l'ordinateur du salon sont deux abonnements.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- L'adresse d'envoi fournie par le navigateur. Globalement unique :
  -- c'est elle qui identifie l'abonnement, pas notre id.
  endpoint   text not null unique,
  p256dh     text not null,   -- clé publique du navigateur (base64url)
  auth       text not null,   -- secret d'authentification (base64url)
  appareil   text,            -- « iPhone », « Chrome sur PC » — pour s'y retrouver
  created_at timestamptz not null default now(),
  dernier_ok timestamptz,
  echecs     smallint not null default 0
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ── Le journal des envois ───────────────────────────────────────────
-- Sans lui, une panne est silencieuse : on croit recevoir des rappels
-- jusqu'au jour où l'on s'aperçoit qu'il n'en arrive plus depuis trois
-- semaines. Le site affiche la dernière ligne dans les Paramètres.
create table if not exists public.envois (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  envoye_le  timestamptz not null default now(),
  nb_rappels smallint not null default 0,
  statut     text not null check (statut in ('ok', 'aucun_abonnement', 'erreur')),
  detail     text
);

create index if not exists envois_user_date_idx
  on public.envois (user_id, envoye_le desc);

-- ── Les réglages, sur le profil ─────────────────────────────────────
-- Ils vivent en base et non dans le navigateur : c'est le serveur qui en
-- a besoin, à 7 h du matin, alors qu'aucun navigateur n'est ouvert.
alter table public.profiles
  add column if not exists resume_actif boolean not null default true;
alter table public.profiles
  add column if not exists heure_resume smallint not null default 7
    check (heure_resume between 0 and 23);
-- Le fuseau est indispensable : « 7 h » n'a de sens que quelque part.
-- Sans lui, le serveur enverrait à 7 h UTC, soit 9 h en été à Paris.
alter table public.profiles
  add column if not exists fuseau text not null default 'Europe/Paris';

-- ── Sécurité ────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;
alter table public.envois             enable row level security;
revoke all on public.push_subscriptions, public.envois from anon;

create policy "push_select" on public.push_subscriptions for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "push_insert" on public.push_subscriptions for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "push_update" on public.push_subscriptions for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "push_delete" on public.push_subscriptions for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- Le journal se lit, ne s'écrit pas : seule la fonction serveur y ajoute
-- des lignes, et elle utilise la clé de service, qui ignore la RLS.
-- L'absence de policy d'insertion est donc volontaire, pas un oubli.
create policy "envois_select" on public.envois for select to authenticated
  using ( (select auth.uid()) = user_id );

-- ── La requête de sélection ─────────────────────────────────────────
--
-- Tout le raisonnement de dates est fait ICI plutôt que dans la fonction
-- serveur, pour deux raisons : PostgreSQL sait convertir un fuseau bien
-- mieux que du JavaScript, et cette requête est vérifiable — elle l'a été
-- sur un vrai PostgreSQL 16 avec deux comptes et plusieurs fuseaux.
create or replace function public.resumes_a_envoyer()
returns table (user_id uuid, titres text[], nb integer)
language sql
stable
as $$
  with cibles as (
    select p.id, p.fuseau
    from public.profiles p
    where p.resume_actif
      -- L'heure locale de la personne, pas celle du serveur.
      and extract(hour from (now() at time zone p.fuseau)) = p.heure_resume
      -- Un seul envoi par jour, même si la tâche planifiée tourne toutes
      -- les heures ou repasse après une panne réseau.
      and not exists (
        select 1 from public.envois e
        where e.user_id = p.id
          and e.statut = 'ok'
          and (e.envoye_le at time zone p.fuseau)::date
              = (now() at time zone p.fuseau)::date
      )
  )
  select c.id,
         array_agg(t.title order by t.due_date nulls last, t.created_at),
         count(*)::integer
  from cibles c
  join public.reminders r
    on r.user_id = c.id
   and r.seen_at is null
   and r.channel = 'in_app'
   and r.remind_on <= (now() at time zone c.fuseau)::date
  join public.tasks t
    on t.id = r.task_id
   and not t.is_done
  group by c.id;
$$;

-- Personne d'autre que la clé de service ne doit pouvoir appeler ça :
-- la fonction lit les tâches de TOUT LE MONDE, par construction.
revoke all on function public.resumes_a_envoyer() from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Vérification, après la migration :
--
--   select * from public.resumes_a_envoyer();
--
-- Ne renvoie rien tant qu'il n'est pas 7 h chez toi — c'est normal.
-- Pour tester tout de suite, mets ton heure sur l'heure courante :
--   update public.profiles set heure_resume = extract(hour from
--     (now() at time zone fuseau)) where id = auth.uid();
-- ────────────────────────────────────────────────────────────────────
