-- ════════════════════════════════════════════════════════════════════
-- 0014 — Un sac à réglages, et les jours du résumé
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0013.
--
-- POURQUOI UNE SEULE COLONNE POUR TOUS LES RÉGLAGES À VENIR
--
-- La configuration des fonctionnalités va grandir : quelle catégorie sert
-- de liste de courses, quels jours envoyer le résumé, où afficher tel
-- panneau, quel rythme de révision par défaut… Une colonne par option,
-- c'est une migration par option — et à chaque fois, la même contrainte
-- de devoir toucher à la base pour un réglage d'affichage.
--
-- Même raisonnement que `revision_plan` (0008) et `modules` (0012) : un
-- objet JSON, lu avec le profil, réécrit en entier, jamais filtré ni
-- trié en SQL. Aucune requête ne cherchera « les profils dont le jour de
-- début de semaine vaut lundi ».
--
-- ⚠️ SAUF UN, ET IL EST ICI : LES JOURS DU RÉSUMÉ
--
-- Celui-là est lu PAR LE SERVEUR, dans la sélection du matin. Il ne peut
-- donc pas rester un réglage d'affichage — d'où la lecture de `reglages`
-- directement dans `resumes_a_envoyer()`.
--
-- CE QUE ÇA CORRIGE
--
-- Recevoir une notification à 7 h le dimanche est l'une des raisons les
-- plus courantes de couper les notifications pour de bon. On ne veut pas
-- gagner un utilisateur le lundi pour le perdre le samedi.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists reglages jsonb not null default '{}'::jsonb;

comment on column public.profiles.reglages is
  'Réglages libres des fonctionnalités. Lu avec le profil, réécrit en entier. '
  'Seul `joursResume` est lu côté serveur, par resumes_a_envoyer().';

-- La forme, pas le contenu : énumérer les clés ici reviendrait à faire
-- une migration par réglage, ce qu'on cherche justement à éviter.
alter table public.profiles drop constraint if exists profiles_reglages_objet;
alter table public.profiles
  add constraint profiles_reglages_objet
  check (jsonb_typeof(reglages) = 'object');

-- ── La sélection du matin respecte les jours choisis ────────────────
-- Reprise mot pour mot de la version durcie en 0010 (jointure sur
-- pg_timezone_names contre les fuseaux inventés, `t.user_id = c.id`
-- contre la fuite de titres) — on n'ajoute QUE le filtre des jours.
--
-- `isodow` vaut 1 le lundi et 7 le dimanche. La valeur est lue dans le
-- FUSEAU DE L'UTILISATEUR, pas en UTC : à 7 h du matin à Paris un lundi,
-- il est encore dimanche 23 h à Vancouver, et le jour de référence doit
-- être celui que la personne a sous les yeux.
--
-- Réglage absent = tous les jours. C'est ce qui fait qu'aucun compte
-- existant ne change de comportement en passant cette migration.
drop function if exists public.resumes_a_envoyer();

create function public.resumes_a_envoyer()
returns table (user_id uuid, titres text[], nb integer, mode text)
language sql
stable
as $$
  with cibles as (
    select p.id, p.fuseau, p.mode_notif
      from public.profiles p
      join pg_catalog.pg_timezone_names z on z.name = p.fuseau
     where p.resume_actif
       and extract(hour from (now() at time zone p.fuseau)) = p.heure_resume
       and (
         p.reglages -> 'joursResume' is null
         or jsonb_typeof(p.reglages -> 'joursResume') <> 'array'
         or (p.reglages -> 'joursResume') @> to_jsonb(
              extract(isodow from (now() at time zone p.fuseau))::integer
            )
       )
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
    join public.tasks t
      on t.id = r.task_id and t.user_id = c.id and not t.is_done
   group by c.id, c.mode_notif;
$$;

revoke all on function public.resumes_a_envoyer() from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   update public.profiles set reglages = '{"joursResume":[1,2,3,4,5]}'
--    where id = auth.uid();
--   select * from public.resumes_a_envoyer();
--
-- Un samedi ou un dimanche, ton compte ne doit plus apparaître. Un
-- réglage absent, ou abîmé, laisse passer tous les jours : un réglage
-- cassé ne doit jamais couper les notifications en silence.
-- ────────────────────────────────────────────────────────────────────
