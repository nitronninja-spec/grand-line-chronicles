-- Grand Line Chronicles — migration #3 : rangs hiérarchiques personnalisés par faction.
-- À exécuter dans Supabase (SQL Editor).

-- Rangs définis par faction : tableau d'objets { nom, ordre } (ordre 1 = rang le plus haut).
alter table factions add column if not exists rangs jsonb default '[]'::jsonb;

-- Rang tenu par un personnage au sein de sa faction (texte libre, doit correspondre
-- à un des rangs définis sur la faction pour apparaître à sa place dans l'organigramme).
alter table personnages add column if not exists rang text;
