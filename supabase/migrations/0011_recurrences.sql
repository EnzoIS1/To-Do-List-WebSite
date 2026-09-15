-- ════════════════════════════════════════════════════════════════════
-- 0011 — Les récurrences : une chose qui revient toute seule
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0010.
--
-- CE QUE ÇA RÉSOUT
--
-- « Si je prends du fromage tous les mois, je veux pouvoir cliquer sur
-- un bouton pour le rajouter automatiquement » et « ajouter la même
-- tâche tous les jours pendant une semaine » sont la MÊME chose : un
-- modèle, un rythme, et des tâches fabriquées à partir de lui. Les
-- articles de courses sont déjà des tâches — rangées dans la catégorie
-- Courses — donc une seule table sert les deux.
--
-- POURQUOI UNE TABLE ET NON UNE COLONNE SUR `tasks`
--
-- Une colonne `recurrence_rule` existe depuis 0001, jamais lue, réservée
-- « v2 ». Elle ne peut pas suffire : la règle doit SURVIVRE aux tâches
-- qu'elle produit. Si elle vivait sur une tâche, cocher puis archiver
-- cette tâche emporterait la règle avec elle — le fromage ne reviendrait
-- qu'une fois. La règle est une entité propre, les tâches en sont les
-- traces.
--
-- LE CURSEUR `prochaine`, ET POURQUOI IL EST LA PIÈCE MAÎTRESSE
--
-- On ne garde pas la liste des occurrences déjà créées : elle existe
-- déjà, ce sont les tâches. On garde une seule date, celle de la
-- prochaine à fabriquer. C'est ce qui rend l'opération REJOUABLE SANS
-- DOUBLON — tant que le curseur n'a pas avancé, rien n'a été créé ; une
-- fois avancé, la même occurrence ne peut plus revenir. Sans lui, il
-- faudrait comparer les dates aux tâches existantes à chaque ouverture,
-- et deux onglets ouverts en même temps créeraient deux fois la même
-- chose.
--
-- LE CLOISONNEMENT, DANS LA LIGNE DE 0010
--
-- Même règle que pour les rappels : les clés étrangères sont COMPOSITES.
-- Un `category_id` seul laisserait une récurrence d'un compte pointer la
-- catégorie d'un autre — RLS vérifie la ligne écrite, jamais la ligne
-- pointée. C'est exactement la faille corrigée en 0010, et il serait
-- absurde de la réintroduire par une table neuve.
-- ════════════════════════════════════════════════════════════════════

-- ── La table ────────────────────────────────────────────────────────
create table if not exists public.recurrences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- Ce qu'on fabrique : les mêmes champs qu'une tâche, en modèle.
  title       text not null check (length(trim(title)) > 0 and length(title) <= 500),
  quantity    text check (quantity is null or length(quantity) <= 100),
  category_id uuid,

  -- Le rythme. Trois unités suffisent à tout ce qui a été demandé ;
  -- « tous les 2 jours » et « tous les mois » en sont deux cas.
  tous_les    smallint not null default 1 check (tous_les between 1 and 60),
  unite       text not null check (unite in ('jour', 'semaine', 'mois')),

  -- La période. `fin` à NULL = sans fin, c'est le cas des courses.
  debut       date not null,
  fin         date,

  -- La tâche produite reçoit-elle une échéance ?
  --
  -- Pour « réviser tous les jours pendant une semaine », oui : chaque
  -- séance est à faire CE jour-là. Pour du fromage dans la liste de
  -- courses, non — et ce n'est pas un détail cosmétique : une tâche datée
  -- déclenche le rappel automatique de la veille (trigger de 0006/0007).
  -- Une liste de courses récurrente notifierait donc toutes les semaines
  -- sans que personne ne l'ait demandé.
  avec_echeance boolean not null default true,

  -- Le curseur : la prochaine occurrence à fabriquer.
  prochaine   date not null,

  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint recurrences_periode_coherente check (fin is null or fin >= debut),
  -- Le curseur ne doit jamais partir avant le début : ce serait du retard
  -- fabriqué de toutes pièces à la première ouverture.
  constraint recurrences_curseur_coherent check (prochaine >= debut)
);

comment on table public.recurrences is
  'Modèles de tâches qui reviennent. Les tâches produites pointent ici par tasks.recurrence_id.';
comment on column public.recurrences.prochaine is
  'Curseur : date de la prochaine occurrence à créer. Avance à chaque fabrication, jamais en arrière.';

-- ── Le lien depuis les tâches produites ─────────────────────────────
-- Il sert à afficher « ↻ » sur une tâche et à retrouver sa règle. Il est
-- volontairement `on delete set null` : supprimer la règle ne doit pas
-- effacer les courses déjà dans le panier.
alter table public.tasks
  add column if not exists recurrence_id uuid;

-- ── Le cloisonnement, en clés composites (voir 0010) ────────────────
-- Il faut une unicité sur (id, user_id) pour pouvoir la référencer.
create unique index if not exists recurrences_id_user_unique
  on public.recurrences (id, user_id);

alter table public.recurrences
  drop constraint if exists recurrences_categorie_du_meme_compte;
alter table public.recurrences
  add constraint recurrences_categorie_du_meme_compte
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id);

alter table public.tasks
  drop constraint if exists tasks_recurrence_du_meme_compte;
alter table public.tasks
  add constraint tasks_recurrence_du_meme_compte
  foreign key (recurrence_id, user_id)
  references public.recurrences (id, user_id)
  on delete set null (recurrence_id);

-- ── Les index qui servent vraiment ──────────────────────────────────
-- La seule requête chaude est « mes récurrences actives dues » : elle
-- tourne à chaque ouverture du site.
create index if not exists recurrences_a_fabriquer
  on public.recurrences (user_id, prochaine) where actif;
create index if not exists tasks_par_recurrence
  on public.tasks (recurrence_id) where recurrence_id is not null;

-- ── updated_at, comme partout ───────────────────────────────────────
drop trigger if exists recurrences_touch_updated_at on public.recurrences;
create trigger recurrences_touch_updated_at
  before update on public.recurrences
  for each row execute function public.touch_updated_at();

-- ── RLS : mêmes règles que les autres tables ────────────────────────
alter table public.recurrences enable row level security;

drop policy if exists "recurrences_select" on public.recurrences;
drop policy if exists "recurrences_insert" on public.recurrences;
drop policy if exists "recurrences_update" on public.recurrences;
drop policy if exists "recurrences_delete" on public.recurrences;

create policy "recurrences_select" on public.recurrences for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "recurrences_insert" on public.recurrences for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "recurrences_update" on public.recurrences for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "recurrences_delete" on public.recurrences for delete to authenticated
  using ( (select auth.uid()) = user_id );
