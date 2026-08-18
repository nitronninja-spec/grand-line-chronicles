-- Grand Line Chronicles — migration #9 :
--   • Personnages : plusieurs rangs (un par faction) au lieu d'un seul rang global
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists rangs jsonb default '[]'::jsonb;

-- Reprend l'ancien rang unique (associé à l'équipage) dans le nouveau format tableau,
-- uniquement pour les personnages qui n'ont pas encore de rangs migrés.
update personnages
set rangs = jsonb_build_array(jsonb_build_object('faction', coalesce(equipage, ''), 'rang', rang))
where rang is not null and rang <> '' and (rangs is null or rangs = '[]'::jsonb);
