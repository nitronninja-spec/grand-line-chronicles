-- Grand Line Chronicles — migration #19 :
--   • Journaux : catégorie (Le Hérault / Marine News), pour distinguer les deux publications
-- À exécuter dans Supabase (SQL Editor).

alter table sessions add column if not exists categorie text;
