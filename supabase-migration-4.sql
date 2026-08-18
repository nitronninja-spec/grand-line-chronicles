-- Grand Line Chronicles — migration #4 :
--   • Personnages : appartenance à plusieurs factions (faction -> factions[])
--   • Îles : chef de l'île, île parente (sous-catégorie)
-- À exécuter dans Supabase (SQL Editor).

-- 1) Personnages : remplace la colonne "faction" (texte unique) par "factions"
-- (tableau de texte), pour permettre l'appartenance à plusieurs factions.
alter table personnages add column if not exists factions text[] default '{}'::text[];

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
