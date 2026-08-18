-- Grand Line Chronicles — migration #12 :
--   • Factions : système de dossiers (une faction peut devenir un dossier contenant d'autres factions),
--     même principe que les archipels pour les îles.
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists est_dossier boolean default false;
alter table factions add column if not exists factions_parentes text[] default '{}';
