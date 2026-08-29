-- Grand Line Chronicles — migration #23 :
--   • Personnages : types de Haki (Observation/Armement/Conquérant)
--   • Personnages : îles liées (en plus de l'île natale), avec note libre par île
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists haki text[] default '{}'::text[];
alter table personnages add column if not exists iles_liees jsonb default '[]'::jsonb;
