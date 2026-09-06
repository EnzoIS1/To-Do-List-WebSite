-- ════════════════════════════════════════════════════════════════════
-- 0008 — Le rythme de révision choisi, gardé avec la tâche
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0007.
--
-- POURQUOI STOCKER LE PLAN, ET PAS SEULEMENT LES SÉANCES
--
-- Les séances sont déjà en base : ce sont des tâches ordinaires reliées
-- par `revision_of`. On pourrait croire que ça suffit. Ça ne suffit pas,
-- à cause de la replanification : quand une séance est validée en retard,
-- le site redistribue les séances restantes sur le temps qui reste. Sans
-- le plan, il ne sait pas COMMENT redistribuer, et retombe sur le mode
-- espacé — c'est-à-dire qu'un « un jour sur deux » choisi par
-- l'utilisateur se transformerait tout seul en écarts croissants, à la
-- première séance faite en retard. Un réglage qui se détricote comme ça
-- est pire que pas de réglage.
--
-- POURQUOI UN SEUL CHAMP JSONB PLUTÔT QUE QUATRE COLONNES
--
-- Le plan est un objet de réglages qui n'est jamais filtré ni trié en
-- SQL : il est lu avec la tâche, appliqué en JavaScript, réécrit en
-- entier. Quatre colonnes (mode, pas, nombre, week-end) demanderaient une
-- migration à chaque option ajoutée, pour aucun gain — aucune requête ne
-- cherche « les tâches dont le pas vaut 2 ».
--
-- Contrainte quand même : le contenu est vérifié à l'écriture. Un jsonb
-- libre finit toujours par contenir n'importe quoi.
-- ════════════════════════════════════════════════════════════════════

alter table public.tasks
  add column if not exists revision_plan jsonb;

comment on column public.tasks.revision_plan is
  'Le rythme de révision choisi : {mode, tousLes, nombre, sansWeekend, debut, fin}. '
  'NULL = le mode espacé par défaut. Lu et appliqué par le site, jamais filtré en SQL.';

-- Le contenu doit rester interprétable : un mode inconnu ferait produire
-- au site un plan vide, en silence, sans que rien ne l'explique.
alter table public.tasks
  drop constraint if exists tasks_revision_plan_valide;

alter table public.tasks
  add constraint tasks_revision_plan_valide check (
    revision_plan is null or (
      jsonb_typeof(revision_plan) = 'object'
      and coalesce(revision_plan ->> 'mode', 'espacees') in ('espacees', 'reguliere')
      and (
        revision_plan -> 'tousLes' is null
        or (jsonb_typeof(revision_plan -> 'tousLes') = 'number'
            and (revision_plan ->> 'tousLes')::numeric between 1 and 30)
      )
      and (
        revision_plan -> 'nombre' is null
        or jsonb_typeof(revision_plan -> 'nombre') = 'null'
        or (jsonb_typeof(revision_plan -> 'nombre') = 'number'
            and (revision_plan ->> 'nombre')::numeric between 1 and 60)
      )
      and (
        revision_plan -> 'sansWeekend' is null
        or jsonb_typeof(revision_plan -> 'sansWeekend') = 'boolean'
      )
      -- Les bornes « du … au … », quand elles sont figées. Le format est
      -- vérifié ici : une chaîne libre ferait produire au site des dates
      -- « Invalid Date » qu'on ne retrouverait que bien plus tard.
      and (
        revision_plan -> 'debut' is null
        or jsonb_typeof(revision_plan -> 'debut') = 'null'
        or (revision_plan ->> 'debut') ~ '^\d{4}-\d{2}-\d{2}$'
      )
      and (
        revision_plan -> 'fin' is null
        or jsonb_typeof(revision_plan -> 'fin') = 'null'
        or (revision_plan ->> 'fin') ~ '^\d{4}-\d{2}-\d{2}$'
      )
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- Vérification :
--   update public.tasks set revision_plan = '{"mode":"reguliere","tousLes":2}'
--    where id = '…';                                    -- accepté
--   update public.tasks set revision_plan = '{"mode":"nimporte"}'
--    where id = '…';                                    -- refusé
--
-- Les tâches existantes gardent revision_plan = NULL, c'est-à-dire le
-- comportement d'avant : écarts croissants.
-- ────────────────────────────────────────────────────────────────────
