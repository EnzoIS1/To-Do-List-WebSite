-- ════════════════════════════════════════════════════════════════════
-- 0009 — Choisir entre un résumé groupé et une notification par tâche
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0008.
--
-- Le résumé groupé reste le défaut : il ne peut jamais noyer l'écran, et
-- c'est ce qu'on veut avec huit rappels un lundi matin. Mais il a un
-- vrai défaut — on ne peut pas traiter les rappels un par un : la
-- notification part en entier dès qu'on la touche.
--
-- Le réglage vit en BASE et non dans le navigateur, pour la même raison
-- que l'heure du résumé : c'est le serveur qui envoie, à 7 h, alors
-- qu'aucun navigateur n'est ouvert. Un choix que seul le téléphone
-- connaîtrait ne servirait à rien.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists mode_notif text not null default 'resume';

alter table public.profiles
  drop constraint if exists profiles_mode_notif_valide;

-- Un mode inconnu ferait retomber la fonction serveur sur le résumé sans
-- rien dire : mieux vaut refuser l'écriture que laisser un réglage qui
-- ment à l'écran.
alter table public.profiles
  add constraint profiles_mode_notif_valide
  check (mode_notif in ('resume', 'par_tache'));

comment on column public.profiles.mode_notif is
  'resume = une notification groupée par jour ; par_tache = une par rappel dû.';

-- ── La sélection du matin renvoie le mode avec le reste ──────────────
-- Seule différence avec 0005 : la colonne `mode`. La fonction serveur en
-- a besoin pour savoir combien de messages composer.
--
-- ⚠️ Il faut SUPPRIMER la fonction avant de la recréer : `create or
-- replace` refuse de changer le type de retour (« cannot change return
-- type of existing function »), et ajouter une colonne au `returns table`
-- est un changement de type de retour. Erreur rencontrée pour de vrai en
-- passant cette migration sur un PostgreSQL 16 de test.
drop function if exists public.resumes_a_envoyer();

create function public.resumes_a_envoyer()
returns table (user_id uuid, titres text[], nb integer, mode text)
language sql
stable
as $$
  with cibles as (
    select p.id, p.fuseau, p.mode_notif
      from public.profiles p
     where p.resume_actif
       and extract(hour from (now() at time zone p.fuseau)) = p.heure_resume
       and not exists (
         select 1 from public.envois e
          where e.user_id = p.id
            and e.statut = 'ok'
            and (e.envoye_le at time zone p.fuseau)::date = (now() at time zone p.fuseau)::date
       )
  )
  select c.id,
         array_agg(t.title order by t.due_date nulls last, t.created_at),
         count(*)::integer,
         c.mode_notif
    from cibles c
    join public.reminders r
      on r.user_id = c.id and r.seen_at is null and r.channel = 'in_app'
     and r.remind_on <= (now() at time zone c.fuseau)::date
    join public.tasks t on t.id = r.task_id and not t.is_done
   group by c.id, c.mode_notif;
$$;

-- Elle reste réservée au rôle de service : c'est lui qui envoie.
revoke all on function public.resumes_a_envoyer() from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   update public.profiles set mode_notif = 'par_tache' where id = auth.uid();
--   select * from public.resumes_a_envoyer();   -- la colonne mode suit
--   update public.profiles set mode_notif = 'nimporte';   -- refusé
-- ────────────────────────────────────────────────────────────────────
