-- Grand Line Chronicles — migration #13 :
--   • Factions : couleur dominante personnalisée par faction (remplace la couleur de sa page)
-- À exécuter dans Supabase (SQL Editor).

alter table factions add column if not exists couleur text;
