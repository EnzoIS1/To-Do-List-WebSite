-- Catégories par défaut d'un nouveau compte.
--
-- À exécuter une fois connecté, ou à transformer en trigger plus tard.
-- Remplace l'identifiant ci-dessous par le tien : tu le trouves dans
-- Supabase → Authentication → Users.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000000';  -- ← à remplacer
  v_etudes  uuid;
  v_perso   uuid;
begin
  insert into public.categories (user_id, name, color, position)
  values (v_user_id, 'Études', '#14614E', 0)
  returning id into v_etudes;

  insert into public.categories (user_id, name, color, position)
  values (v_user_id, 'Vie perso', '#9C5227', 1)
  returning id into v_perso;

  -- Sous-catégories : c'est le rôle de parent_id
  insert into public.categories (user_id, parent_id, name, color, position) values
    (v_user_id, v_etudes, 'Devoirs',  '#14614E', 0),
    (v_user_id, v_etudes, 'Rendus',   '#14614E', 1),
    (v_user_id, v_perso,  'Ménage',   '#9C5227', 0),
    (v_user_id, v_perso,  'Courses',  '#9C5227', 1);
end $$;
