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
