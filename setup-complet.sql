-- ============================================================================
-- Grand Line Chronicles — SETUP COMPLET (base Supabase vierge)
-- ============================================================================
-- Ce script permet de recréer l'intégralité de la base de données en une seule
-- exécution, dans le SQL Editor d'un projet Supabase tout neuf.
--
-- IMPORTANT — ce que ce fichier contient et pourquoi :
--
-- Les 22 fichiers "supabase-migration-N.sql" du dépôt ne sont que des ALTER TABLE
-- incrémentaux : ils supposent que 6 tables existent déjà (personnages, fruits,
-- iles, factions, sessions, lore). Ces 6 tables n'ont jamais été créées par un
-- script SQL — elles ont été créées à la main dans le tableau de bord Supabase,
-- avant même la première migration. Il n'existe donc aucune trace écrite de leur
-- schéma d'origine.
--
-- La section 1 ci-dessous RECONSTRUIT ces 6 tables avec leurs seules colonnes
-- "d'origine" (celles qu'aucune migration n'ajoute) — chaque migration rejouée
-- ensuite ajoute alors exactement les colonnes qu'elle a toujours ajoutées,
-- dans le même ordre historique, sans rien dupliquer ni rien casser.
--
-- La section 2 crée le bucket de stockage "media" (photos de toutes les fiches) :
-- lui non plus n'a jamais été scripté (créé à la main dans Supabase Storage).
-- Sans lui, aucun upload d'image ne fonctionnera.
--
-- La section 3 est la concaténation, TELLE QUELLE, des 22 fichiers de migration
-- (+ le tout premier fichier non numéroté "supabase-migration.sql"), dans l'ordre
-- chronologique exact où ils ont été exécutés sur le projet d'origine.
--
-- Sécurité (RLS) : comme sur le projet d'origine, ces 6 tables restent sans Row
-- Level Security (accès libre via la clé anon, exactement comme aujourd'hui) —
-- seules despas/lames/cristaux_primordiaux/pds/categories l'activent avec une
-- policy publique, et faction_relations la désactive explicitement (cf. section 3).
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Tables de base (reconstruites depuis le schéma actuel en
-- production ; colonnes d'origine uniquement, chaque migration rejouée plus
-- bas ajoute le reste dans l'ordre historique)
-- ============================================================================

create table if not exists personnages (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  surnom text,
  emoji text,
  photos text[] default '{}'::text[],
  type text,
  equipage text,
  prime text,
  statut text,
  fruit text,
  tags text,
  description text,
  historique text,
  techniques text,
  gdoc text,
  miro text,
  fav boolean default false,
  created_at timestamptz default now()
);

create table if not exists fruits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  jp text,
  type text,
  puissance int,
  emoji text,
  description text,
  proprietaire text,
  color text,
  photo text,
  created_at timestamptz default now()
);

create table if not exists iles (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  emoji text,
  region text,
  climat text,
  description text,
  photo text,
  gdoc text,
  miro text,
  created_at timestamptz default now()
);

create table if not exists factions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  emoji text,
  type text,
  description text,
  gdoc text,
  miro text,
  created_at timestamptz default now()
);

-- "sessions" = table des Journaux (renommée à l'affichage seulement, jamais en base)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  num int,
  titre text not null,
  date date,
  lieu text,
  resume text,
  gdoc text,
  miro text,
  created_at timestamptz default now()
);

create table if not exists lore (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  categorie text,
  contenu text,
  emoji text,
  tags text,
  modifie timestamptz default now(),
  created_at timestamptz default now()
);


-- ============================================================================
-- SECTION 2 — Bucket de stockage "media" (photos de toutes les fiches)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
drop policy if exists "public insert media" on storage.objects;
drop policy if exists "public update media" on storage.objects;
drop policy if exists "public delete media" on storage.objects;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "public insert media" on storage.objects for insert with check (bucket_id = 'media');
create policy "public update media" on storage.objects for update using (bucket_id = 'media');
create policy "public delete media" on storage.objects for delete using (bucket_id = 'media');


-- ============================================================================
-- SECTION 3 — Historique complet des migrations, dans l'ordre chronologique
-- ============================================================================

-- ----------------------------------------------------------------------------
-- supabase-migration.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration pour : Despas, Lames, Cristaux Primordiaux,
-- lien Personnage -> Île, lien Île -> Faction.
-- À exécuter dans Supabase (SQL Editor) avant de tester les nouvelles pages.

-- 1) Liens entre tables existantes
alter table personnages add column if not exists ile text;
alter table iles add column if not exists faction text;

-- 2) Despas — prothèses artificielles (équivalent technologique des Fruits)
create table if not exists despas (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text,
  puissance int,
  emoji text,
  description text,
  cout text,
  proprietaire text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- 3) Lames — sabres et armes blanches nommées
create table if not exists lames (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  jp text,
  rang text,
  puissance int,
  emoji text,
  description text,
  proprietaire text,
  particularites text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- 4) Cristaux Primordiaux — la catégorie est libre (créée par vous à la volée
-- dans le formulaire), pas une liste fixe : simple colonne texte.
create table if not exists cristaux_primordiaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text,
  puissance int,
  emoji text,
  description text,
  proprietaire text,
  instabilite text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- Si vous aviez déjà exécuté une version précédente de ce script (colonne "element"),
-- ce bloc la renomme automatiquement en "categorie" sans rien casser.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'cristaux_primordiaux' and column_name = 'element')
     and not exists (select 1 from information_schema.columns where table_name = 'cristaux_primordiaux' and column_name = 'categorie') then
    alter table cristaux_primordiaux rename column element to categorie;
  end if;
end $$;

-- 5) RLS — ouvre l'accès public (lecture/écriture) comme les autres tables du projet.
-- Si tes tables existantes (fruits, iles...) utilisent des règles différentes,
-- adapte ces policies en conséquence avant de les exécuter.
alter table despas enable row level security;
alter table lames enable row level security;
alter table cristaux_primordiaux enable row level security;

create policy "public access despas" on despas for all using (true) with check (true);
create policy "public access lames" on lames for all using (true) with check (true);
create policy "public access cristaux_primordiaux" on cristaux_primordiaux for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- supabase-migration-2.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #2 : lien Personnage -> Faction.
-- (Personnage -> Île et Île -> Faction viennent de supabase-migration.sql, déjà exécuté.)
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists faction text;

-- ----------------------------------------------------------------------------
-- supabase-migration-3.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #3 : rangs hiérarchiques personnalisés par faction.
-- À exécuter dans Supabase (SQL Editor).

-- Rangs définis par faction : tableau d'objets { nom, ordre } (ordre 1 = rang le plus haut).
alter table factions add column if not exists rangs jsonb default '[]'::jsonb;

-- Rang tenu par un personnage au sein de sa faction (texte libre, doit correspondre
-- à un des rangs définis sur la faction pour apparaître à sa place dans l'organigramme).
alter table personnages add column if not exists rang text;

-- ----------------------------------------------------------------------------
-- supabase-migration-4.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #4 :
--   • Personnages : appartenance à plusieurs factions (faction -> factions[])
--   • Îles : chef de l'île, île parente (sous-catégorie)
-- À exécuter dans Supabase (SQL Editor).

-- 1) Personnages : remplace la colonne "faction" (texte unique) par "factions"
-- (tableau de texte), pour permettre l'appartenance à plusieurs factions.
alter table personnages add column if not exists factions text[] default '{}'::text[];

-- Garde défensive : garantit que "faction" existe avant d'être lue ci-dessous, quel que
-- soit l'état exact dans lequel ce script a été exécuté (ajoutée pour setup-complet.sql,
-- absente du fichier de migration original qui supposait un historique déjà en place).
alter table personnages add column if not exists faction text;

-- Reprend les valeurs existantes de "faction" dans le nouveau tableau.
update personnages
  set factions = array[faction]
  where faction is not null and trim(faction) <> '' and (factions is null or factions = '{}');

-- Supprime l'ancienne colonne, désormais inutilisée par l'app.
alter table personnages drop column if exists faction;

-- 2) Îles : chef de l'île (nom d'un personnage) et île parente (nom d'une autre île,
-- pour représenter les sous-catégories, ex. archipels).
alter table iles add column if not exists chef text;
alter table iles add column if not exists ile_parente text;

-- ----------------------------------------------------------------------------
-- supabase-migration-5.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #5 :
--   • Îles : archipels/dossiers, plusieurs factions par île, plusieurs îles parentes
-- À exécuter dans Supabase (SQL Editor). Suppose que supabase-migration-4.sql
-- a déjà été exécuté (colonnes iles.faction, iles.ile_parente présentes).

-- 1) Archipel / groupe d'îles : une île marquée ainsi devient un dossier
-- dans la liste, pouvant contenir des sous-îles.
alter table iles add column if not exists est_archipel boolean default false;

-- 2) Plusieurs factions par île (remplace la colonne "faction" texte unique).
alter table iles add column if not exists factions text[] default '{}'::text[];
-- Garde défensive (ajoutée pour setup-complet.sql) : garantit "faction" avant lecture.
alter table iles add column if not exists faction text;
update iles
  set factions = array[faction]
  where faction is not null and trim(faction) <> '' and (factions is null or factions = '{}');
alter table iles drop column if exists faction;

-- 3) Plusieurs îles parentes (remplace la colonne "ile_parente" texte unique).
-- Permet à une île d'être rangée dans plusieurs archipels/dossiers à la fois.
alter table iles add column if not exists iles_parentes text[] default '{}'::text[];
-- Garde défensive (ajoutée pour setup-complet.sql) : garantit "ile_parente" avant lecture.
alter table iles add column if not exists ile_parente text;
update iles
  set iles_parentes = array[ile_parente]
  where ile_parente is not null and trim(ile_parente) <> '' and (iles_parentes is null or iles_parentes = '{}');
alter table iles drop column if exists ile_parente;

-- ----------------------------------------------------------------------------
-- supabase-migration-6.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #6 : statut "Détruite" pour les îles/archipels.
-- À exécuter dans Supabase (SQL Editor).

alter table iles add column if not exists est_detruite boolean default false;

-- ----------------------------------------------------------------------------
-- supabase-migration-7.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #7 :
--   • Journaux (ex-Campagne) : photos, PDFs, personnages liés
--   • Lore : images
-- À exécuter dans Supabase (SQL Editor). Les deux tables sont vides,
-- donc aucun backfill n'est nécessaire.

-- Journaux (table "sessions", inchangée — seul l'habillage devient "Journaux")
alter table sessions add column if not exists photos text[] default '{}'::text[];
alter table sessions add column if not exists pdfs jsonb default '[]'::jsonb;
alter table sessions add column if not exists personnages text[] default '{}'::text[];

-- Lore : galerie d'images (la première sert de couverture)
alter table lore add column if not exists photos text[] default '{}'::text[];

-- ----------------------------------------------------------------------------
-- supabase-migration-8.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #8 :
--   • Personnages : condition de la prime, titre mondial (Empereur/Amiral/Vice-Amiral)
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists condition_prime text default 'mort_ou_vif';
alter table personnages add column if not exists titre_mondial text default '';

-- ----------------------------------------------------------------------------
-- supabase-migration-9.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #9 :
--   • Personnages : plusieurs rangs (un par faction) au lieu d'un seul rang global
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists rangs jsonb default '[]'::jsonb;
-- Garde défensive (ajoutée pour setup-complet.sql) : garantit "equipage" et "rang" avant
-- lecture ci-dessous — "equipage" est censée venir de la table de base (section 1),
-- "rang" de supabase-migration-3.sql, mais on ne prend aucun risque ici.
alter table personnages add column if not exists equipage text;
alter table personnages add column if not exists rang text;

-- Reprend l'ancien rang unique (associé à l'équipage) dans le nouveau format tableau,
-- uniquement pour les personnages qui n'ont pas encore de rangs migrés.
update personnages
set rangs = jsonb_build_array(jsonb_build_object('faction', coalesce(equipage, ''), 'rang', rang))
where rang is not null and rang <> '' and (rangs is null or rangs = '[]'::jsonb);

-- ----------------------------------------------------------------------------
-- supabase-migration-10.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #10 :
--   • Nouvelle table faction_relations (alliance / ennemie / neutre entre deux factions)
--   • Position mémorisée des factions sur le schéma de relations (rel_x, rel_y en %)
-- À exécuter dans Supabase (SQL Editor).

create table if not exists faction_relations (
  id uuid primary key default gen_random_uuid(),
  faction_a text not null,
  faction_b text not null,
  type text not null default 'neutre',
  note text default '',
  created_at timestamptz default now()
);

alter table factions add column if not exists rel_x numeric;
alter table factions add column if not exists rel_y numeric;

-- ----------------------------------------------------------------------------
-- supabase-migration-11.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #11 :
--   • faction_relations a été créée avec Row Level Security activé par défaut (comportement
--     standard Supabase pour une nouvelle table), ce qui bloque toute écriture avec la clé anon.
--     Toutes les autres tables de l'app ont RLS désactivé — on aligne faction_relations dessus.
-- À exécuter dans Supabase (SQL Editor).

alter table faction_relations disable row level security;

-- ----------------------------------------------------------------------------
-- supabase-migration-12.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #12 :
--   • Factions : système de dossiers (une faction peut devenir un dossier contenant d'autres factions),
--     même principe que les archipels pour les îles.
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists est_dossier boolean default false;
alter table factions add column if not exists factions_parentes text[] default '{}';

-- ----------------------------------------------------------------------------
-- supabase-migration-13.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #13 :
--   • Factions : couleur dominante personnalisée par faction (remplace la couleur de sa page)
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists couleur text;

-- ----------------------------------------------------------------------------
-- supabase-migration-14.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #14 :
--   • Factions : ordre de classement manuel (glisser-déposer), en plus du tri par catégorie/A-Z/prime
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists ordre_manuel integer;

-- ----------------------------------------------------------------------------
-- supabase-migration-15.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #15 :
--   • Fruits : plusieurs images (photos[]), champs "Capacités" et "Lore", statut "Perdu"/"Mangé",
--     "Ancien détenteur"
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists photos text[];
alter table fruits add column if not exists capacites text;
alter table fruits add column if not exists lore text;
alter table fruits add column if not exists statut text;
alter table fruits add column if not exists ancien_detenteur text;
-- Garde défensive (ajoutée pour setup-complet.sql) : garantit "photo" avant lecture.
alter table fruits add column if not exists photo text;

-- Reprend l'ancienne photo unique dans le nouveau tableau photos[], pour ne rien perdre.
update fruits set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);

-- ----------------------------------------------------------------------------
-- supabase-migration-16.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #16 :
--   • Fruits : champ "Prix"
--   • Lames : "Ancien détenteur", champ "Prix", plusieurs images (photos[])
--   • Cristaux : champ "Prix", plusieurs images (photos[])
--   • Despas, Îles, Factions : plusieurs images (photos[])
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists prix text;

alter table lames add column if not exists ancien_detenteur text;
alter table lames add column if not exists prix text;
alter table lames add column if not exists photos text[];

alter table cristaux_primordiaux add column if not exists prix text;
alter table cristaux_primordiaux add column if not exists photos text[];

alter table despas add column if not exists photos text[];

alter table iles add column if not exists photos text[];

alter table factions add column if not exists photos text[];

-- Gardes défensives (ajoutées pour setup-complet.sql) : garantissent "photo" sur chaque
-- table avant lecture ci-dessous.
alter table lames add column if not exists photo text;
alter table cristaux_primordiaux add column if not exists photo text;
alter table despas add column if not exists photo text;
alter table iles add column if not exists photo text;

-- Reprend chaque ancienne photo unique dans le nouveau tableau photos[], pour ne rien perdre.
update lames set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update cristaux_primordiaux set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update despas set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update iles set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);

-- ----------------------------------------------------------------------------
-- supabase-migration-17.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #17 :
--   • Lames : champs "Capacités" et "Lore"
-- À exécuter dans Supabase (SQL Editor).

alter table lames add column if not exists capacites text;
alter table lames add column if not exists lore text;

-- ----------------------------------------------------------------------------
-- supabase-migration-18.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #18 :
--   • DS (despas) : nouveaux champs Code / Classe / Statut / Modificateur / Ancien détenteur / Capacités
--   • PDS : nouvelle table, entièrement séparée des DS
-- À exécuter dans Supabase (SQL Editor).

-- DS — champs additionnels (la table "despas" existante devient la page /despa)
alter table despas add column if not exists code text;
alter table despas add column if not exists classe text;
alter table despas add column if not exists statut text;
alter table despas add column if not exists modificateur text;
alter table despas add column if not exists ancien_detenteur text;
alter table despas add column if not exists capacites text;

-- PDS — être vivant porteur d'une anomalie, jamais fusionné avec les DS
create table if not exists pds (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code text,
  type text,
  classe text,
  statut text,
  hereditaire boolean default false,
  emoji text,
  color text,
  photos text[],
  pouvoir text,
  faiblesse text,
  objectif_etude text,
  despas_derives text[],
  sujet_nom text,
  sujet_statut text,
  sujet_photos text[],
  sujet_biographie text,
  sujet_notes text,
  created_at timestamptz default now()
);

alter table pds enable row level security;
create policy "public access pds" on pds for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- supabase-migration-19.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #19 :
--   • Journaux : catégorie (Le Hérault / Marine News), pour distinguer les deux publications
-- À exécuter dans Supabase (SQL Editor).

alter table sessions add column if not exists categorie text;

-- ----------------------------------------------------------------------------
-- supabase-migration-20.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #20 :
--   • Taxonomies configurables : table générique "categories" (content_type + dimension)
--   • Seed intégral des valeurs actuellement codées en dur dans chaque page, pour que la
--     future section Dashboard → Personnalisation reflète immédiatement l'état réel du site.
--   • Aucune table existante n'est modifiée — chaque fiche continue de stocker sa valeur en
--     texte brut (fruits.type, despas.classe, etc.), "categories" ne fait que cataloguer les
--     valeurs valides, leur ordre, couleur et icône.
-- À exécuter dans Supabase (SQL Editor).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  dimension text not null default 'categorie',
  value text not null,
  label text,
  emoji text,
  color text,
  cap integer,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists categories_type_dim_value_uniq
  on categories(content_type, dimension, value);

alter table categories enable row level security;

drop policy if exists "public access categories" on categories;
create policy "public access categories" on categories for all using (true) with check (true);

-- ─── Fruits ──────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('fruits', 'type', 'Paramecia', 'Paramecia', '🔮', '#40d060', 0),
  ('fruits', 'type', 'Logia', 'Logia', '🌪️', '#ff8c40', 1),
  ('fruits', 'type', 'Zoan', 'Zoan', '🐾', '#a060ff', 2),
  ('fruits', 'type', 'Mythical', 'Mythical Zoan', '✨', '#d4a017', 3),
  ('fruits', 'type', 'Inconnu', 'Inconnu', '❓', '#7a9ab8', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('fruits', 'statut', 'mange', 'Mangé', '🍽️', '#e03030', 0),
  ('fruits', 'statut', 'perdu', 'Perdu', '❓', '#a0a0c0', 1),
  ('fruits', 'statut', 'stocke', 'Stocké', '📦', '#00c8ff', 2)
on conflict do nothing;

-- ─── Lames ───────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, cap, ordre) values
  ('lames', 'rang', 'Grande Lame', 'Grande Lame', '🔪', '#5a6a78', 200, 0),
  ('lames', 'rang', 'Lame de qualité', 'Lame de qualité', '🗡️', '#7a9ab8', 100, 1),
  ('lames', 'rang', 'Lame de Grande qualité', 'Lame de Grande qualité', '⚔️', '#00c8ff', 50, 2),
  ('lames', 'rang', 'Lame de 1er Ordre', 'Lame de 1er Ordre', '🔱', '#a060ff', 20, 3),
  ('lames', 'rang', 'Lame Légendaire', 'Lame Légendaire', '✨', '#d4a017', 10, 4)
on conflict do nothing;

-- ─── DS (despas) ─────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'type', 'Cristallin', 'Cristallin', '#7c5cff', 0),
  ('despa', 'type', 'Biologique', 'Biologique', '#7c5cff', 1),
  ('despa', 'type', 'Hybride', 'Hybride', '#7c5cff', 2),
  ('despa', 'type', 'Technologique', 'Technologique', '#7c5cff', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'classe', 'C', 'C', '#7a9ab8', 0),
  ('despa', 'classe', 'B', 'B', '#40d060', 1),
  ('despa', 'classe', 'A', 'A', '#00c8ff', 2),
  ('despa', 'classe', 'S', 'S', '#a060ff', 3),
  ('despa', 'classe', 'SS', 'SS', '#d4a017', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'statut', 'Actif', 'Actif', '#40d060', 0),
  ('despa', 'statut', 'Perdu', 'Perdu', '#a0a0c0', 1),
  ('despa', 'statut', 'Inachevé', 'Inachevé', '#f0c040', 2),
  ('despa', 'statut', 'En Stase', 'En Stase', '#00c8ff', 3),
  ('despa', 'statut', 'Contrôlé', 'Contrôlé', '#e03030', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'modificateur', 'Aucun', 'Aucun', '#7a9ab8', 0),
  ('despa', 'modificateur', 'Consommable', 'Consommable', '#40d060', 1),
  ('despa', 'modificateur', 'Limité', 'Limité', '#ff8c40', 2)
on conflict do nothing;

-- ─── PDS ─────────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'type', 'Résonance', 'Résonance', '#40d060', 0),
  ('pds', 'type', 'Mutationnel', 'Mutationnel', '#40d060', 1),
  ('pds', 'type', 'Bestial', 'Bestial', '#40d060', 2),
  ('pds', 'type', 'Héritage', 'Héritage', '#40d060', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'classe', 'C', 'C', '#7a9ab8', 0),
  ('pds', 'classe', 'B', 'B', '#40d060', 1),
  ('pds', 'classe', 'A', 'A', '#00c8ff', 2),
  ('pds', 'classe', 'S', 'S', '#a060ff', 3),
  ('pds', 'classe', 'SS', 'SS', '#d4a017', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'statut', 'Actif', 'Actif', '#40d060', 0),
  ('pds', 'statut', 'Perdu', 'Perdu', '#a0a0c0', 1),
  ('pds', 'statut', 'En Stase', 'En Stase', '#00c8ff', 2),
  ('pds', 'statut', 'En fuite', 'En fuite', '#ff8c40', 3),
  ('pds', 'statut', 'Neutralisé', 'Neutralisé', '#e03030', 4),
  ('pds', 'statut', 'Inconnu', 'Inconnu', '#7a9ab8', 5)
on conflict do nothing;

-- ─── Personnages ─────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('personnages', 'type', 'pj', 'Joueurs', '#00c8ff', 0),
  ('personnages', 'type', 'pnj', 'PNJ', '#d4a017', 1),
  ('personnages', 'type', 'allié', 'Alliés', '#40d060', 2),
  ('personnages', 'type', 'antagoniste', 'Antagonistes', '#e03030', 3),
  ('personnages', 'type', 'ambivalent', 'Ambivalents', '#a060ff', 4),
  ('personnages', 'type', 'inconnu', 'Inconnus', '#7a9ab8', 5)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('personnages', 'statut', 'vivant', 'Vivant', '#40d060', 0),
  ('personnages', 'statut', 'mort', 'Mort', '#ff6060', 1),
  ('personnages', 'statut', 'disparu', 'Disparu', '#ffb060', 2),
  ('personnages', 'statut', 'inconnu', 'Inconnu', '#a0a0c0', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('personnages', 'titre_mondial', 'Empereur', 'Empereur', '👑', '#e03030', 0),
  ('personnages', 'titre_mondial', 'Empereur Déchu', 'Empereur Déchu', '👑', '#8a5a3a', 1),
  ('personnages', 'titre_mondial', 'Amiral', 'Amiral', '⚓', '#00c8ff', 2),
  ('personnages', 'titre_mondial', 'Amiral Déchu', 'Amiral Déchu', '⚓', '#5a7a8a', 3),
  ('personnages', 'titre_mondial', 'Shichibukai', 'Shichibukai', '🗡️', '#a060ff', 4),
  ('personnages', 'titre_mondial', 'Shichibukai Déchu', 'Shichibukai Déchu', '🗡️', '#6a4a7a', 5),
  ('personnages', 'titre_mondial', 'Dragon Céleste', 'Dragon Céleste', '🫧', '#f0c040', 6)
on conflict do nothing;

-- ─── Factions ────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('factions', 'type', 'Pirates', 'Pirates', '🏴‍☠️', '#d4a017', 0),
  ('factions', 'type', 'Marine', 'Marine', '⚓', '#00c8ff', 1),
  ('factions', 'type', 'Gouvernement', 'Gouvernement', '🏛️', '#4488ff', 2),
  ('factions', 'type', 'Révolutionnaire', 'Révolutionnaire', '✊', '#e03030', 3),
  ('factions', 'type', 'Peuple', 'Peuple', '👥', '#40e0a0', 4),
  ('factions', 'type', 'Neutre', 'Neutre', '🤝', '#7a9ab8', 5),
  ('factions', 'type', 'Autre', 'Autre', '⚔️', '#a060ff', 6)
on conflict do nothing;

-- ─── Îles ────────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('iles', 'region', 'East Blue', 'East Blue', '#00c8ff', 0),
  ('iles', 'region', 'West Blue', 'West Blue', '#4488ff', 1),
  ('iles', 'region', 'North Blue', 'North Blue', '#a060ff', 2),
  ('iles', 'region', 'South Blue', 'South Blue', '#40d060', 3),
  ('iles', 'region', 'Grand Line', 'Grand Line', '#d4a017', 4),
  ('iles', 'region', 'Red Line', 'Red Line', '#ff8c40', 5),
  ('iles', 'region', 'New World', 'New World', '#e03030', 6),
  ('iles', 'region', 'Région inconnue', 'Région inconnue', '#7a9ab8', 7)
on conflict do nothing;

-- ─── Journaux (sessions) ─────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('journaux', 'categorie', 'Le Hérault', 'Le Hérault', '📰', '#d4a017', 0),
  ('journaux', 'categorie', 'Marine News', 'Marine News', '⚓', '#3f7fe0', 1)
on conflict do nothing;

-- ─── Lore ────────────────────────────────────────────────────────────────
-- "Magie" est volontairement omise : 0 fiche l'utilise et l'univers repose sur le Haki,
-- pas la magie (cf. demande de nettoyage de Matéis).
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('lore', 'categorie', 'histoire', 'Histoire', '📜', '#d4a017', 0),
  ('lore', 'categorie', 'geographie', 'Géographie', '🌍', '#00c8ff', 1),
  ('lore', 'categorie', 'personnage', 'Personnage', '👤', '#40d060', 2),
  ('lore', 'categorie', 'faction', 'Faction', '⚔️', '#e03030', 3),
  ('lore', 'categorie', 'divers', 'Divers', '📌', '#7a9ab8', 4)
on conflict do nothing;

-- ─── Cristaux ────────────────────────────────────────────────────────────
-- Aucune valeur en dur à seeder ici : la page dérivait déjà ses catégories des fiches
-- existantes (aucune fiche en base actuellement). La Personnalisation permettra d'en
-- ajouter directement ; la page continuera de proposer aussi la saisie libre existante.

-- ----------------------------------------------------------------------------
-- supabase-migration-21.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #21 :
--   • Tri manuel généralisé à toutes les sections (glisser-déposer) — factions a déjà
--     "ordre_manuel" depuis la migration #14, ce script l'ajoute partout ailleurs.
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists ordre_manuel integer;
alter table despas add column if not exists ordre_manuel integer;
alter table pds add column if not exists ordre_manuel integer;
alter table lames add column if not exists ordre_manuel integer;
alter table cristaux_primordiaux add column if not exists ordre_manuel integer;
alter table iles add column if not exists ordre_manuel integer;
alter table lore add column if not exists ordre_manuel integer;
alter table sessions add column if not exists ordre_manuel integer;
alter table personnages add column if not exists ordre_manuel integer;

-- ----------------------------------------------------------------------------
-- supabase-migration-22.sql
-- ----------------------------------------------------------------------------
-- Grand Line Chronicles — migration #22 :
--   • Relation Fruit ↔ Lame ("mangé par") : un fruit peut être lié à la lame qui l'a
--     consommé. Couplé au statut du fruit côté application (lier passe le fruit à "Mangé"
--     et vide son propriétaire), pas de trigger SQL — géré dans fruits/page.tsx.
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists lame_id uuid references lames(id) on delete set null;
