-- ════════════════════════════════════════════════════════════════════
-- 0007 — Pouvoir retirer le rappel automatique, et que ça tienne
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0006.
--
-- LE PROBLÈME
--
-- Depuis 0006, toute tâche datée porte un rappel automatique. Le retirer
-- depuis le site marchait… jusqu'à la modification suivante de la tâche :
-- le trigger se rallume à chaque écriture sur due_date, is_done ou
-- revision_of, et le rappel refusé revenait tout seul. Décocher puis
-- recocher une tâche suffisait. Un refus qui ne tient pas est pire que
-- pas de bouton du tout — il donne l'impression que le site oublie.
--
-- LA CORRECTION
--
-- Le refus devient un fait rangé sur la TÂCHE, pas l'absence d'une ligne
-- dans reminders. Le trigger le lit avant de reposer quoi que ce soit.
-- C'est le seul endroit qui survit à un rechargement, à un autre appareil
-- et au trigger lui-même.
-- ════════════════════════════════════════════════════════════════════

alter table public.tasks
  add column if not exists rappel_auto boolean not null default true;

comment on column public.tasks.rappel_auto is
  'Faux quand l''utilisateur a retiré le rappel automatique de cette tâche : '
  'le trigger cesse alors de le reposer.';

-- ── Le trigger, avec le refus en plus ───────────────────────────────
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

  if new.due_date is not null and not new.is_done and new.rappel_auto then
    jour := case
      when new.revision_of is not null then new.due_date   -- révision : le jour même
      else new.due_date - 1                                 -- le reste : la veille
    end;

    insert into public.reminders (user_id, task_id, remind_on, channel, auto)
    values (new.user_id, new.id, jour, 'in_app', true)
    on conflict (task_id, remind_on) do nothing;
  end if;

  return new;
end;
$$;

-- `rappel_auto` doit relancer le trigger : sans ça, remettre le rappel
-- depuis le site changerait la colonne sans rien reposer en base.
drop trigger if exists tasks_rappel_automatique on public.tasks;
create trigger tasks_rappel_automatique
  after insert or update of due_date, is_done, revision_of, rappel_auto
  on public.tasks
  for each row execute function public.rappel_automatique();

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   update public.tasks set rappel_auto = false where id = '…';
--   -- le rappel de la veille disparaît
--   update public.tasks set is_done = true, is_done = false where id = '…';
--   -- il ne revient pas
--   update public.tasks set rappel_auto = true where id = '…';
--   -- il revient
-- ────────────────────────────────────────────────────────────────────
