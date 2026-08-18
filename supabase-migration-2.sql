-- Grand Line Chronicles — migration #2 : lien Personnage -> Faction.
-- (Personnage -> Île et Île -> Faction viennent de supabase-migration.sql, déjà exécuté.)
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists faction text;
