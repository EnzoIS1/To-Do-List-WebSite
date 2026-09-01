-- Profils : le prolongement applicatif du compte Supabase
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Catégories : hiérarchie à deux niveaux via parent_id
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references public.categories(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  color      text not null default '#14614E',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- Tâches : devoirs, ménage, courses — tout passe par ici
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  title           text not null check (length(trim(title)) > 0),
  notes           text,
  due_date        date,          -- volontairement date, jamais timestamptz
  is_done         boolean not null default false,
  completed_at    timestamptz,
  priority        smallint not null default 0 check (priority between 0 and 2),
  quantity        text,          -- utilisé par la liste de courses
  recurrence_rule text,          -- réservé v2, non lu par l'application
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Rappels : une date d'apparition, un canal, un état « vu »
create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  task_id    uuid not null references public.tasks(id) on delete cascade,
  remind_on  date not null,
  channel    text not null default 'in_app' check (channel in ('in_app','email')),
  seen_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Index : chaque colonne filtrée par une requête ou par une policy
create index tasks_user_due_idx       on public.tasks (user_id, due_date);
create index tasks_user_category_idx  on public.tasks (user_id, category_id);
create index tasks_user_open_idx      on public.tasks (user_id) where is_done = false;
create index categories_user_idx      on public.categories (user_id, parent_id);
create index reminders_user_date_idx  on public.reminders (user_id, remind_on) where seen_at is null;
create index reminders_task_idx       on public.reminders (task_id);