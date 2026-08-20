-- Grand Line Chronicles — migration #19 :
--   • Journaux : catégorie (Le Hérault / Marine News) et scène, pour hiérarchiser les entrées
-- À exécuter dans Supabase (SQL Editor).

alter table sessions add column if not exists categorie text;
alter table sessions add column if not exists scene text;
