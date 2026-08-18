-- Grand Line Chronicles — migration #11 :
--   • faction_relations a été créée avec Row Level Security activé par défaut (comportement
--     standard Supabase pour une nouvelle table), ce qui bloque toute écriture avec la clé anon.
--     Toutes les autres tables de l'app ont RLS désactivé — on aligne faction_relations dessus.
-- À exécuter dans Supabase (SQL Editor).

alter table faction_relations disable row level security;
