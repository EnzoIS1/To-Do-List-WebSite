-- ════════════════════════════════════════════════════════════════════
-- 0006 — Un rappel automatique sur toute tâche datée
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0005.
--
-- Règle : une tâche qui a une date et qui n'est pas faite se rappelle
-- toute seule. La veille pour une tâche ordinaire, le jour même pour une
-- séance de révision — une révision prévue mardi n'a aucun intérêt à être
-- annoncée lundi, c'est mardi qu'il faut s'y mettre.
--
-- Pourquoi un trigger et pas du code côté site : le rappel doit exister
-- quelle que soit la façon dont la tâche est arrivée en base — saisie à la
-- main, créée par le planificateur de révisions, ou modifiée depuis un
-- autre appareil. Une règle posée dans un seul composant React ne couvre
-- que le chemin qui passe par ce composant.
-- ════════════════════════════════════════════════════════════════════

-- Distingue les rappels posés par la machine de ceux posés à la main :
-- on ne doit jamais effacer un rappel que l'utilisateur a choisi lui-même.
alter table public.reminders
  add column if not exists auto boolean not null default false;

-- Deux rappels le même jour pour la même tâche n'apportent rien, et
-- rendraient le ménage du trigger ambigu. On dédoublonne l'existant avant
-- de poser la contrainte, sinon la création de l'index échouerait.
delete from public.reminders r
  using public.reminders garde
 where r.task_id = garde.task_id
   and r.remind_on = garde.remind_on
   and r.id > garde.id;

create unique index if not exists reminders_tache_jour_idx
  on public.reminders (task_id, remind_on);

-- ── Le trigger ──────────────────────────────────────────────────────
create or replace function public.rappel_automatique()
returns trigger
language plpgsql
as $$
declare
  jour date;
begin
  -- On retire l'ancien rappel automatique — mais jamais un rappel déjà vu
  -- (c'est de l'historique) ni un rappel posé à la main (`auto` est faux).
  delete from public.reminders
   where task_id = new.id and auto and seen_at is null;

  if new.due_date is not null and not new.is_done then
    jour := case
      when new.revision_of is not null then new.due_date   -- révision : le jour même
      else new.due_date - 1                                 -- le reste : la veille
    end;

    insert into public.reminders (user_id, task_id, remind_on, channel, auto)
    values (new.user_id, new.id, jour, 'in_app', true)
    -- Un rappel manuel existe déjà ce jour-là : on lui laisse la place
    -- plutôt que d'échouer ou de le remplacer.
    on conflict (task_id, remind_on) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_rappel_automatique on public.tasks;
create trigger tasks_rappel_automatique
  after insert or update of due_date, is_done, revision_of on public.tasks
  for each row execute function public.rappel_automatique();

-- ── Rattrapage sur les tâches déjà en base ──────────────────────────
-- Sans ça, la règle ne s'appliquerait qu'aux tâches créées après la
-- migration, et les tâches déjà saisies resteraient muettes.
insert into public.reminders (user_id, task_id, remind_on, channel, auto)
select t.user_id, t.id,
       case when t.revision_of is not null then t.due_date else t.due_date - 1 end,
       'in_app', true
  from public.tasks t
 where t.due_date is not null
   and not t.is_done
on conflict (task_id, remind_on) do nothing;

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   select t.title, r.remind_on, r.auto
--     from public.reminders r join public.tasks t on t.id = r.task_id
--    order by r.remind_on;
--
-- Une tâche datée du 20 doit avoir un rappel au 19 ; une séance de
-- révision datée du 20, un rappel au 20.
-- ────────────────────────────────────────────────────────────────────
