-- Créer le profil automatiquement à l'inscription,
-- pour ne pas dépendre du front pour une donnée obligatoire.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tenir updated_at à jour sans y penser côté application
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Renseigner ou effacer completed_at en même temps que is_done
create function public.sync_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_done and not old.is_done then
    new.completed_at = now();
  elsif not new.is_done and old.is_done then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completed_at
  before update on public.tasks
  for each row execute function public.sync_completed_at();