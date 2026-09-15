-- ════════════════════════════════════════════════════════════════════
-- 0013 — Le suivi de délégation : ce qu'on attend de quelqu'un
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0012.
--
-- UNE SEULE MÉCANIQUE, QUATRE USAGES
--
-- « En attente de » (salarié), « ce qui bloque » (manager), « délégué à »
-- (chef d'équipe) et « relance client » (indépendant) sont la même chose :
-- une tâche confiée à quelqu'un, une date de départ, et une relance au
-- bout d'un certain temps. Trois colonnes suffisent.
--
-- POURQUOI DU TEXTE LIBRE ET PAS UN VRAI DESTINATAIRE
--
-- Parce que les gens qu'on attend n'ont pas de compte sur ce site, et
-- n'en auront pas. « La compta », « Mme Roux », « le client » : ce qui
-- compte est de s'en souvenir, pas de l'authentifier. Une table de
-- contacts ajouterait une saisie, une gestion de doublons et un écran de
-- plus, pour zéro gain sur l'usage réel.
--
-- LA RELANCE PASSE PAR LES RAPPELS QUI EXISTENT DÉJÀ
--
-- Pas de nouveau canal : la relance est un rappel ordinaire, posé au jour
-- calculé. Il apparaît donc dans le bandeau du tableau de bord ET dans le
-- résumé du matin, sans une ligne de code côté serveur.
--
-- ⚠️ LE PIÈGE, ET LA COLONNE `motif`
--
-- Le trigger de 0006 efface TOUS les rappels automatiques non vus d'une
-- tâche avant de reposer celui de l'échéance. Sans distinction, il
-- effacerait la relance à chaque modification de la tâche — le même bug
-- que celui corrigé en 0007, sous une autre forme. `motif` sépare les
-- deux familles, et chaque trigger ne touche qu'à la sienne.
-- ════════════════════════════════════════════════════════════════════

-- ── Les trois colonnes ──────────────────────────────────────────────
alter table public.tasks
  add column if not exists attente_de     text,
  add column if not exists attente_depuis date,
  add column if not exists relance_apres  smallint;

comment on column public.tasks.attente_de is
  'Qui on attend, en texte libre. NULL = la tâche n''attend personne.';
comment on column public.tasks.attente_depuis is
  'Depuis quand on attend. Sert au compteur de jours et au calcul de la relance.';
comment on column public.tasks.relance_apres is
  'Relancer au bout de N jours. NULL = aucune relance automatique.';

alter table public.tasks drop constraint if exists tasks_attente_de_longueur;
alter table public.tasks
  add constraint tasks_attente_de_longueur
  check (attente_de is null or (length(trim(attente_de)) > 0 and length(attente_de) <= 100));

alter table public.tasks drop constraint if exists tasks_relance_raisonnable;
alter table public.tasks
  add constraint tasks_relance_raisonnable
  check (relance_apres is null or relance_apres between 1 and 365);

-- Une relance sans personne à relancer n'a pas de sens, et une attente
-- sans date de départ ne saurait pas compter les jours.
alter table public.tasks drop constraint if exists tasks_attente_coherente;
alter table public.tasks
  add constraint tasks_attente_coherente
  check (
    (attente_de is null and attente_depuis is null and relance_apres is null)
    or (attente_de is not null and attente_depuis is not null)
  );

create index if not exists tasks_en_attente
  on public.tasks (user_id, attente_depuis)
  where attente_de is not null and not is_done;

-- ── Séparer les deux familles de rappels automatiques ───────────────
alter table public.reminders
  add column if not exists motif text not null default 'echeance';

alter table public.reminders drop constraint if exists reminders_motif_connu;
alter table public.reminders
  add constraint reminders_motif_connu
  check (motif in ('echeance', 'relance'));

comment on column public.reminders.motif is
  'echeance = le rappel avant la date ; relance = la relance d''une attente. '
  'Chaque trigger ne réécrit que les siens.';

-- ── 0006 corrigé : il ne touche plus qu''aux rappels d''échéance ────
create or replace function public.rappel_automatique()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  jour date;
begin
  -- ⚠️ `motif = 'echeance'` est l'ajout de 0013. Sans lui, toute écriture
  -- sur la tâche effacerait la relance posée par l'autre trigger.
  delete from public.reminders
   where task_id = new.id and auto and motif = 'echeance' and seen_at is null;

  if new.due_date is not null and not new.is_done and coalesce(new.rappel_auto, true) then
    jour := case
      when new.revision_of is not null then new.due_date
      else new.due_date - 1
    end;

    insert into public.reminders (user_id, task_id, remind_on, channel, auto, motif)
    values (new.user_id, new.id, jour, 'in_app', true, 'echeance')
    on conflict (task_id, remind_on) do nothing;
  end if;

  return new;
end;
$$;

-- ── Le nouveau trigger : la relance ─────────────────────────────────
create or replace function public.rappel_de_relance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  jour date;
begin
  delete from public.reminders
   where task_id = new.id and auto and motif = 'relance' and seen_at is null;

  if new.attente_de is not null
     and new.relance_apres is not null
     and not new.is_done then
    jour := new.attente_depuis + new.relance_apres;

    insert into public.reminders (user_id, task_id, remind_on, channel, auto, motif)
    values (new.user_id, new.id, jour, 'in_app', true, 'relance')
    -- Un rappel existe déjà ce jour-là pour cette tâche : on lui laisse
    -- la place. Deux notifications le même jour pour la même chose
    -- n'apprendraient rien de plus.
    on conflict (task_id, remind_on) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_rappel_de_relance on public.tasks;
create trigger tasks_rappel_de_relance
  after insert or update of attente_de, attente_depuis, relance_apres, is_done
  on public.tasks
  for each row execute function public.rappel_de_relance();

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   update public.tasks
--      set attente_de = 'La compta', attente_depuis = current_date, relance_apres = 7
--    where title = '<une tâche>';
--   select remind_on, motif, auto from public.reminders where task_id = '<id>';
--
-- On doit voir la relance à J+7, ET le rappel d'échéance s'il y en avait
-- un : les deux coexistent, c'est tout l'objet de `motif`.
-- ────────────────────────────────────────────────────────────────────
