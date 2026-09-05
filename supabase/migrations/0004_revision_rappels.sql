-- ════════════════════════════════════════════════════════════════════
-- 0004 — Révisions espacées
--
-- À lancer dans Supabase → SQL Editor, une seule fois, APRÈS 0001-0003.
-- Ces trois colonnes suffisent : une révision est une tâche ordinaire.
-- Elle s'affiche dans le calendrier, se coche, se supprime comme les
-- autres — inutile de lui inventer une table à part.
--
-- Les rappels, eux, existent déjà : table `reminders` de la migration 0001.
-- Rien à ajouter pour eux.
-- ════════════════════════════════════════════════════════════════════

-- Sur la tâche SOURCE : le jour du contrôle. Type `date`, comme due_date —
-- jamais timestamptz, sinon la date change selon le fuseau.
alter table public.tasks
  add column if not exists exam_date date;

-- Sur chaque tâche de RÉVISION : vers quelle tâche source elle pointe.
-- `on delete cascade` : supprimer le devoir supprime ses révisions, ce qui
-- évite les orphelines « Réviser : … » sans rien à réviser.
alter table public.tasks
  add column if not exists revision_of uuid references public.tasks(id) on delete cascade;

-- Rang de la séance (1 = la première). Sert à afficher « révision 2/4 ».
alter table public.tasks
  add column if not exists revision_index smallint;

create index if not exists tasks_revision_of_idx on public.tasks (revision_of);

-- ────────────────────────────────────────────────────────────────────
-- Rien à faire côté sécurité.
--
-- Les policies de la migration 0002 portent sur la TABLE, pas sur une
-- liste de colonnes : une colonne ajoutée est couverte immédiatement.
-- Une révision créée par un autre compte reste invisible et impossible
-- à modifier, sans une ligne de plus.
--
-- Vérification, connecté avec ton compte :
--   select id, title, revision_of, revision_index, exam_date
--     from public.tasks where revision_of is not null;
-- ────────────────────────────────────────────────────────────────────
