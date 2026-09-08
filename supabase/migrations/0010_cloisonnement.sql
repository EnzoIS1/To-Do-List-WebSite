-- ════════════════════════════════════════════════════════════════════
-- 0010 — Colmatage : trois passages d'un compte à l'autre, et la
--        validation de ce que la base accepte de stocker
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0009.
--
-- ─────────────────────────────────────────────────────────────────────
-- CE QUI A ÉTÉ TROUVÉ, ET COMMENT
--
-- Une attaque rejouée sur un vrai PostgreSQL 16 avec deux comptes :
-- « Alice » connectée normalement, « Bob » victime. La RLS tient sur
-- l'essentiel — Alice ne lit AUCUNE ligne de Bob, n'écrit rien chez lui,
-- ne peut pas déplacer une tâche vers son compte, ne peut ni appeler
-- resumes_a_envoyer() ni écrire dans le journal d'envois.
--
-- Mais trois écritures passaient, et elles ont un point commun : la RLS
-- vérifie le `user_id` de la LIGNE ÉCRITE, jamais celui de la ligne
-- POINTÉE. Rien n'empêchait donc Alice de pointer les objets de Bob :
--
--   1. FUITE DE DONNÉES (la plus grave). Alice insère un rappel à son
--      nom (`user_id` = Alice, donc la RLS l'accepte) mais dont le
--      `task_id` est une tâche de BOB. Le lendemain matin, le résumé
--      d'Alice — composé côté serveur avec la clé de service, qui ignore
--      la RLS — contient le TITRE de la tâche de Bob. Vérifié : la
--      notification d'Alice affichait « RENDEZ-VOUS CONFIDENTIEL DE BOB ».
--
--   2. Alice range une de ses tâches dans une CATÉGORIE de Bob.
--   3. Alice rattache une de ses tâches comme RÉVISION d'une tâche de Bob.
--
-- Il faut connaître l'UUID visé, ce qui limite l'exploitation — mais un
-- UUID fuit facilement (une capture d'écran, un export, une URL) et
-- « difficile à deviner » n'est pas un contrôle d'accès.
--
-- LA CORRECTION : des clés étrangères COMPOSITES. Au lieu de « ce
-- task_id existe », la base exige désormais « ce task_id existe ET
-- appartient au même utilisateur ». Ce n'est plus une règle qu'on peut
-- oublier d'écrire dans une requête : c'est le schéma qui refuse.
-- ─────────────────────────────────────────────────────────────────────

-- ── 0. Ménage préalable ─────────────────────────────────────────────
-- Les contraintes ci-dessous refuseraient de se créer s'il existe déjà
-- des lignes qui les violent. Sur ta base il ne devrait y en avoir
-- aucune ; ces trois requêtes ne sont là que pour que la migration passe
-- même si quelqu'un s'est déjà servi de la faille.
delete from public.reminders r
 using public.tasks t
 where t.id = r.task_id and t.user_id <> r.user_id;

update public.tasks t set category_id = null
 where category_id is not null
   and not exists (select 1 from public.categories c
                    where c.id = t.category_id and c.user_id = t.user_id);

update public.tasks t set revision_of = null
 where revision_of is not null
   and not exists (select 1 from public.tasks s
                    where s.id = t.revision_of and s.user_id = t.user_id);

-- ── 1. Les cibles des clés composites ───────────────────────────────
-- `unique (id, user_id)` est redondant avec la clé primaire — c'est
-- justement ce qui permet à une clé étrangère de porter sur le couple.
alter table public.tasks
  drop constraint if exists tasks_id_user_unique,
  add constraint tasks_id_user_unique unique (id, user_id);

alter table public.categories
  drop constraint if exists categories_id_user_unique,
  add constraint categories_id_user_unique unique (id, user_id);

-- ── 2. Un rappel ne peut viser que SA PROPRE tâche ──────────────────
alter table public.reminders
  drop constraint if exists reminders_task_id_fkey,
  drop constraint if exists reminders_tache_du_meme_compte;

alter table public.reminders
  add constraint reminders_tache_du_meme_compte
  foreign key (task_id, user_id) references public.tasks (id, user_id)
  on delete cascade;

-- ── 3. Une tâche ne peut être rangée que dans SA PROPRE catégorie ───
alter table public.tasks
  drop constraint if exists tasks_category_id_fkey,
  drop constraint if exists tasks_categorie_du_meme_compte;

-- `on delete set null (category_id)` — et surtout PAS `set null` tout
-- court : la forme courte viderait les DEUX colonnes du couple, donc
-- `user_id`, qui est `not null`. Toute suppression de catégorie
-- échouerait. (Syntaxe disponible depuis PostgreSQL 15.)
alter table public.tasks
  add constraint tasks_categorie_du_meme_compte
  foreign key (category_id, user_id) references public.categories (id, user_id)
  on delete set null (category_id);

-- ── 4. Une révision ne peut dépendre que de SA PROPRE tâche ─────────
alter table public.tasks
  drop constraint if exists tasks_revision_of_fkey,
  drop constraint if exists tasks_revision_du_meme_compte;

alter table public.tasks
  add constraint tasks_revision_du_meme_compte
  foreign key (revision_of, user_id) references public.tasks (id, user_id)
  on delete cascade;

-- ════════════════════════════════════════════════════════════════════
-- CE QUE LA BASE ACCEPTE DE STOCKER
--
-- Deuxième famille de trouvailles : aucune limite sur le CONTENU. La
-- RLS dit qui peut écrire, jamais quoi.
-- ════════════════════════════════════════════════════════════════════

-- ── 5. L'adresse d'un appareil (la plus sérieuse des quatre) ────────
--
-- `push_subscriptions.endpoint` était un texte libre. Or c'est
-- exactement l'adresse que la fonction serveur appelle en POST, depuis
-- l'intérieur du réseau de Supabase, avec la clé de service. Enregistrer
-- « http://169.254.169.254/latest/meta-data/ » comme appareil était
-- accepté : c'est l'adresse du service de métadonnées des machines
-- cloud, et c'est le point de départ classique d'une attaque SSRF.
--
-- On restreint donc aux services de notification réels. La liste est
-- volontairement courte : ce sont les seuls que les navigateurs
-- utilisent. Si un nouveau service apparaît, l'abonnement sera refusé
-- avec un message clair plutôt que d'ouvrir la porte à tout le reste.
delete from public.push_subscriptions
 where endpoint !~ '^https://[A-Za-z0-9.-]+\.(googleapis\.com|apple\.com|mozilla\.com|windows\.com)/';

alter table public.push_subscriptions
  drop constraint if exists push_endpoint_connu;

alter table public.push_subscriptions
  add constraint push_endpoint_connu check (
    endpoint ~ '^https://[A-Za-z0-9.-]+\.(googleapis\.com|apple\.com|mozilla\.com|windows\.com)/'
  );

comment on constraint push_endpoint_connu on public.push_subscriptions is
  'L''adresse est appelée par la fonction serveur : elle doit être un vrai '
  'service de notification, jamais une adresse interne (SSRF).';

-- ── 6. Des textes bornés ────────────────────────────────────────────
-- Rien n'empêchait d'écrire un titre de 5 Mo — accepté, mesuré. C'est
-- la base et le quota du projet qu'on remplit, et chaque chargement du
-- site qui les retélécharge.
update public.tasks set title = left(title, 500) where length(title) > 500;
update public.tasks set notes = left(notes, 5000) where length(notes) > 5000;
update public.tasks set quantity = left(quantity, 100) where length(quantity) > 100;
update public.categories set name = left(name, 100) where length(name) > 100;

alter table public.tasks
  drop constraint if exists tasks_longueurs_raisonnables,
  add constraint tasks_longueurs_raisonnables check (
    length(title) <= 500
    and (notes is null or length(notes) <= 5000)
    and (quantity is null or length(quantity) <= 100)
  );

alter table public.categories
  drop constraint if exists categories_longueurs_raisonnables,
  add constraint categories_longueurs_raisonnables check (length(name) <= 100);

-- ── 7. La couleur d'une catégorie est une couleur ───────────────────
-- Elle est injectée telle quelle dans une variable CSS. Un navigateur
-- moderne ne peut pas en faire du code, mais une valeur libre peut
-- déclencher un chargement extérieur (`url(...)`) et casser l'affichage.
-- Une couleur hexadécimale, et rien d'autre.
update public.categories set color = '#14614E'
 where color !~ '^#[0-9A-Fa-f]{6}$';

alter table public.categories
  drop constraint if exists categories_couleur_hexa,
  add constraint categories_couleur_hexa check (color ~ '^#[0-9A-Fa-f]{6}$');

-- ── 8. Le fuseau horaire doit exister ───────────────────────────────
--
-- `profiles.fuseau` était un texte libre, et il est utilisé tel quel
-- dans `now() at time zone p.fuseau`. Un fuseau inconnu fait ÉCHOUER la
-- requête — pas seulement pour la personne concernée : la sélection du
-- matin est une seule requête pour tout le monde. Une ligne saboteuse
-- pouvait donc priver TOUS les comptes de leur résumé. Vérifié : la
-- clause exacte de la fonction lève « time zone not recognized ».
--
-- Un CHECK ne peut pas interroger pg_timezone_names (ce n'est pas
-- immuable) : c'est donc un trigger, et la fonction de sélection est en
-- plus rendue insensible au problème (point 9).
create or replace function public.fuseau_valide()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.fuseau is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.fuseau
  ) then
    raise exception 'Fuseau horaire inconnu : %', new.fuseau
      using hint = 'Utilise un nom de la base IANA, par exemple Europe/Paris.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_fuseau_valide on public.profiles;
create trigger profiles_fuseau_valide
  before insert or update of fuseau on public.profiles
  for each row execute function public.fuseau_valide();

-- Les lignes déjà en base ne passent pas par le trigger : on les répare.
update public.profiles
   set fuseau = 'Europe/Paris'
 where fuseau is null
    or not exists (select 1 from pg_timezone_names where name = fuseau);

-- ── 9. La sélection du matin ne peut plus être sabotée ──────────────
-- Deux ceintures : le fuseau est validé à l'écriture (point 8), ET la
-- requête ignore une ligne dont le fuseau serait malgré tout inconnu.
-- Une seule ligne fautive ne doit jamais faire tomber l'envoi de tous.
drop function if exists public.resumes_a_envoyer();

create function public.resumes_a_envoyer()
returns table (user_id uuid, titres text[], nb integer, mode text)
language sql
stable
as $$
  with cibles as (
    select p.id, p.fuseau, p.mode_notif
      from public.profiles p
      join pg_catalog.pg_timezone_names z on z.name = p.fuseau
     where p.resume_actif
       and extract(hour from (now() at time zone p.fuseau)) = p.heure_resume
       and not exists (
         select 1 from public.envois e
          where e.user_id = p.id
            and e.statut = 'ok'
            and (e.envoye_le at time zone p.fuseau)::date = (now() at time zone p.fuseau)::date
       )
  )
  select c.id,
         array_agg(t.title order by t.due_date nulls last, t.created_at),
         count(*)::integer,
         c.mode_notif
    from cibles c
    join public.reminders r
      on r.user_id = c.id and r.seen_at is null and r.channel = 'in_app'
     and r.remind_on <= (now() at time zone c.fuseau)::date
    -- `t.user_id = c.id` : deuxième ceinture derrière la clé composite
    -- du point 2. Même si une ligne croisée survivait quelque part, le
    -- titre d'autrui ne partirait pas dans une notification.
    join public.tasks t
      on t.id = r.task_id and t.user_id = c.id and not t.is_done
   group by c.id, c.mode_notif;
$$;

revoke all on function public.resumes_a_envoyer() from public, anon, authenticated;

-- ── 10. Le chemin de recherche des fonctions de trigger ─────────────
-- Elles n'étaient pas qualifiées et n'épinglaient pas leur search_path.
-- Ce n'est pas exploitable ici (elles ne sont pas SECURITY DEFINER),
-- mais c'est le contrôle que Supabase signale, et le corriger coûte une
-- ligne par fonction.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create or replace function public.sync_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_done and not old.is_done then new.completed_at = now();
  elsif not new.is_done and old.is_done then new.completed_at = null;
  end if;
  return new;
end; $$;

create or replace function public.rappel_automatique()
returns trigger language plpgsql set search_path = '' as $$
declare
  jour date;
begin
  delete from public.reminders
   where task_id = new.id and auto and seen_at is null;

  if new.due_date is not null and not new.is_done and new.rappel_auto then
    jour := case
      when new.revision_of is not null then new.due_date
      else new.due_date - 1
    end;
    insert into public.reminders (user_id, task_id, remind_on, channel, auto)
    values (new.user_id, new.id, jour, 'in_app', true)
    on conflict (task_id, remind_on) do nothing;
  end if;

  return new;
end; $$;

-- ────────────────────────────────────────────────────────────────────
-- Vérification (à faire avec deux comptes) :
--   insert into public.reminders (user_id, task_id, remind_on, channel)
--   values (auth.uid(), '<une tâche d''un autre compte>', current_date, 'in_app');
--   -- doit être REFUSÉ : violates foreign key constraint
--
--   update public.profiles set fuseau = 'Pas/Un-Fuseau';
--   -- doit être REFUSÉ : Fuseau horaire inconnu
-- ────────────────────────────────────────────────────────────────────
