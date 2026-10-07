-- ════════════════════════════════════════════════════════════════════
-- 0015 — Plus de doublons dans le résumé, et le renvoi du jour
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0014.
--
-- 1. LE DOUBLON DU RÉSUMÉ — un vrai défaut, pas un confort
--
-- Une tâche peut porter plusieurs rappels : « une semaine avant » ET
-- « la veille ». C'est voulu, ils ne tombent pas le même jour. Mais dès
-- qu'on laisse passer quelques jours, les deux deviennent dus en même
-- temps, et `array_agg(t.title)` sort DEUX FOIS le même titre.
--
-- Conséquence concrète : la notification du matin annonce « 5 choses à
-- faire » alors qu'il y en a trois, et la liste répète deux fois la même
-- ligne. En mode « une notification par tâche », ce sont carrément deux
-- notifications identiques pour la même tâche.
--
-- La correction tient dans un `distinct` sur la TÂCHE — pas sur le titre,
-- parce que deux tâches différentes ont parfaitement le droit de porter
-- le même nom.
--
-- 2. LE RENVOI DU JOUR
--
-- `resume_du_jour()` compose le résumé d'UNE personne, sans regarder
-- l'heure ni le journal d'envois. C'est ce qui permet au bouton
-- « Renvoyer les notifications du jour » de refaire l'envoi du matin
-- quand on l'a manqué, balayé par erreur, ou reçu sur un appareil qu'on
-- n'a plus sous la main.
--
-- ⚠️ Elle ne touche PAS au journal : un renvoi n'est pas l'envoi du
-- jour. S'il comptait comme tel, renvoyer à midi empêcherait le vrai
-- résumé du lendemain matin — exactement le piège déjà documenté pour le
-- mode essai dans la fonction serveur.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. La sélection du matin, sans doublon ──────────────────────────
-- Tout le reste est repris mot pour mot de 0014 : la jointure sur
-- pg_timezone_names (contre les fuseaux inventés, 0010), le filtre des
-- jours (0014) et `t.user_id = c.id` (contre la fuite de titres, 0010).
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
  ),
  -- UNE LIGNE PAR TÂCHE, pas par rappel : c'est tout le correctif.
  -- `distinct` porte sur t.id, donc deux tâches homonymes restent deux
  -- entrées — ce qui est correct, elles sont bien distinctes.
  dues as (
    select distinct c.id as cible, t.id as tache, t.title, t.due_date, t.created_at, c.mode_notif
      from cibles c
      join public.reminders r
        on r.user_id = c.id and r.seen_at is null and r.channel = 'in_app'
       and r.remind_on <= (now() at time zone c.fuseau)::date
      join public.tasks t
        on t.id = r.task_id and t.user_id = c.id and not t.is_done
  )
  select d.cible,
         array_agg(d.title order by d.due_date nulls last, d.created_at),
         count(*)::integer,
         d.mode_notif
    from dues d
   group by d.cible, d.mode_notif;
$$;

revoke all on function public.resumes_a_envoyer() from public, anon, authenticated;

-- ── 2. Le résumé d'une seule personne, à la demande ─────────────────
drop function if exists public.resume_du_jour(uuid);

create function public.resume_du_jour(p_user uuid)
returns table (titres text[], nb integer, mode text)
language sql
stable
as $$
  with moi as (
    select p.id, coalesce(p.fuseau, 'UTC') as fuseau, p.mode_notif
      from public.profiles p
      left join pg_catalog.pg_timezone_names z on z.name = p.fuseau
     where p.id = p_user
       -- Pas de filtre sur l'heure, le jour ni le journal : c'est un
       -- renvoi manuel, demandé explicitement. Les conditions du matin
       -- n'ont rien à y faire.
  ),
  dues as (
    select distinct m.id as cible, t.id as tache, t.title, t.due_date, t.created_at, m.mode_notif
      from moi m
      join public.reminders r
        on r.user_id = m.id and r.seen_at is null and r.channel = 'in_app'
       and r.remind_on <= (now() at time zone m.fuseau)::date
      join public.tasks t
        on t.id = r.task_id and t.user_id = m.id and not t.is_done
  )
  select array_agg(d.title order by d.due_date nulls last, d.created_at),
         count(*)::integer,
         d.mode_notif
    from dues d
   group by d.cible, d.mode_notif;
$$;

-- Comme sa grande sœur : réservée au rôle de service. C'est la fonction
-- serveur qui l'appelle, APRÈS avoir vérifié le jeton de la personne —
-- l'identifiant ne vient donc jamais du navigateur sans contrôle.
revoke all on function public.resume_du_jour(uuid) from public, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   -- poser deux rappels échus sur la MÊME tâche, puis :
--   select nb, titres from public.resume_du_jour(auth.uid());
--
-- `nb` doit compter la tâche une seule fois, et `titres` ne doit pas
-- répéter son titre.
-- ────────────────────────────────────────────────────────────────────
