-- Grand Line Chronicles — migration #5 :
--   • Îles : archipels/dossiers, plusieurs factions par île, plusieurs îles parentes
-- À exécuter dans Supabase (SQL Editor). Suppose que supabase-migration-4.sql
-- a déjà été exécuté (colonnes iles.faction, iles.ile_parente présentes).

-- 1) Archipel / groupe d'îles : une île marquée ainsi devient un dossier
-- dans la liste, pouvant contenir des sous-îles.
alter table iles add column if not exists est_archipel boolean default false;

-- 2) Plusieurs factions par île (remplace la colonne "faction" texte unique).
alter table iles add column if not exists factions text[] default '{}'::text[];
update iles
  set factions = array[faction]
  where faction is not null and trim(faction) <> '' and (factions is null or factions = '{}');
alter table iles drop column if exists faction;

-- 3) Plusieurs îles parentes (remplace la colonne "ile_parente" texte unique).
-- Permet à une île d'être rangée dans plusieurs archipels/dossiers à la fois.
alter table iles add column if not exists iles_parentes text[] default '{}'::text[];
update iles
  set iles_parentes = array[ile_parente]
  where ile_parente is not null and trim(ile_parente) <> '' and (iles_parentes is null or iles_parentes = '{}');
alter table iles drop column if exists ile_parente;
