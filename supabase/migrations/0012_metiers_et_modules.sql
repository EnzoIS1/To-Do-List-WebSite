-- ════════════════════════════════════════════════════════════════════
-- 0012 — Le métier, et les modules qu'il allume
--
-- À lancer dans Supabase → SQL Editor, APRÈS 0001-0011.
--
-- LA DEMANDE, ET LE DÉSACCORD ASSUMÉ
--
-- La demande était : « pouvoir choisir le métier (étudiant, salarié, chef
-- d'entreprise, cadre) pour que les fonctionnalités changent en fonction —
-- par exemple le mode révision seulement si je suis étudiant ».
--
-- Le métier comme FILTRE est le mauvais modèle : un salarié prépare une
-- certification, un étudiant est auto-entrepreneur. Le métier prédit mal
-- les besoins. Il est donc gardé comme PRÉRÉGLAGE — il allume des modules
-- par défaut — et ce sont les modules qui commandent l'interface.
-- C'est aussi moins de code : un seul mécanisme, plus quatre listes de
-- valeurs par défaut.
--
-- POURQUOI DEUX COLONNES ET NON UNE
--
-- `metier` sert à proposer les bons défauts et à s'en souvenir ; `modules`
-- porte l'état réel. Les garder séparés permet de changer de métier sans
-- écraser silencieusement les modules qu'on a activés à la main — le site
-- peut proposer « veux-tu reprendre les réglages conseillés ? » au lieu de
-- décider tout seul.
--
-- POURQUOI `modules` EST DU JSONB
--
-- Même raisonnement que `revision_plan` en 0008 : c'est un sac de
-- booléens, jamais filtré ni trié en SQL, lu avec le profil et réécrit en
-- entier. Une colonne par module demanderait une migration à chaque
-- module ajouté, pour aucun gain — aucune requête ne cherche « les
-- profils dont le module révision est allumé ».
--
-- La contrainte vérifie quand même la FORME : un objet, et uniquement des
-- booléens. Un jsonb libre finit toujours par contenir n'importe quoi, et
-- une valeur non booléenne rendrait une fonctionnalité visible ou
-- invisible pour une raison que personne ne saurait expliquer.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists metier text,
  add column if not exists modules jsonb not null default '{}'::jsonb;

comment on column public.profiles.metier is
  'Préréglage choisi : etudiant | salarie | cadre | independant. NULL = jamais choisi.';
comment on column public.profiles.modules is
  'Les modules réellement allumés : {"revision": true, ...}. Le métier ne fait que proposer ces valeurs.';

alter table public.profiles
  drop constraint if exists profiles_metier_connu;
alter table public.profiles
  add constraint profiles_metier_connu
  check (metier is null or metier in ('etudiant', 'salarie', 'cadre', 'independant'));

-- La forme, pas le contenu : on n'énumère pas les modules ici, sinon
-- ajouter un module demanderait une migration — exactement ce qu'on
-- voulait éviter.
--
-- ⚠️ POURQUOI UNE FONCTION ET NON UN `check` DIRECT
--
-- Parcourir un jsonb demande `jsonb_each`, donc une sous-requête, et
-- PostgreSQL les interdit dans une contrainte : « cannot use subquery in
-- check constraint ». Erreur rencontrée pour de vrai en passant cette
-- migration sur un PostgreSQL 16 de test. Une fonction IMMUTABLE fait le
-- même travail et, elle, est acceptée.
--
-- La limite à connaître : PostgreSQL ne revalide pas les lignes
-- existantes si la fonction change plus tard. Ici elle ne changera pas —
-- elle ne fait que vérifier un type.
create or replace function public.modules_valides(m jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(m) = 'object'
     and not exists (
       select 1 from jsonb_each(m) as e(cle, valeur)
        where jsonb_typeof(e.valeur) <> 'boolean'
     );
$$;

alter table public.profiles
  drop constraint if exists profiles_modules_booleens;
alter table public.profiles
  add constraint profiles_modules_booleens
  check (public.modules_valides(modules));
