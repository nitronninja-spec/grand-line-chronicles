-- Grand Line Chronicles — migration #6 : statut "Détruite" pour les îles/archipels.
-- À exécuter dans Supabase (SQL Editor).

alter table iles add column if not exists est_detruite boolean default false;
