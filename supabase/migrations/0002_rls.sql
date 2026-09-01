-- Sans cette ligne, une table du schéma public est lisible par quiconque
-- possède la clé anon — qui est publique par conception.
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.tasks      enable row level security;
alter table public.reminders  enable row level security;

-- Rien n'est accessible sans être connecté
revoke all on public.profiles, public.categories, public.tasks, public.reminders from anon;

-- profiles : chacun ne voit et ne modifie que sa propre ligne
create policy "profiles_select" on public.profiles for select to authenticated
  using ( (select auth.uid()) = id );
create policy "profiles_update" on public.profiles for update to authenticated
  using ( (select auth.uid()) = id ) with check ( (select auth.uid()) = id );

-- categories : le même quatuor de règles, sur user_id
create policy "categories_select" on public.categories for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "categories_insert" on public.categories for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "categories_update" on public.categories for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "categories_delete" on public.categories for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- tasks
create policy "tasks_select" on public.tasks for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "tasks_update" on public.tasks for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "tasks_delete" on public.tasks for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- reminders
create policy "reminders_select" on public.reminders for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "reminders_insert" on public.reminders for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "reminders_update" on public.reminders for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "reminders_delete" on public.reminders for delete to authenticated
  using ( (select auth.uid()) = user_id );