-- Grand Line Chronicles — migration #17 :
--   • Lames : champs "Capacités" et "Lore"
-- À exécuter dans Supabase (SQL Editor).

alter table lames add column if not exists capacites text;
alter table lames add column if not exists lore text;
