-- Grand Line Chronicles — migration #14 :
--   • Factions : ordre de classement manuel (glisser-déposer), en plus du tri par catégorie/A-Z/prime
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists ordre_manuel integer;
