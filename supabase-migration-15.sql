-- Grand Line Chronicles — migration #15 :
--   • Fruits : plusieurs images (photos[]), champs "Capacités" et "Lore", statut "Perdu"/"Mangé",
--     "Ancien détenteur"
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists photos text[];
alter table fruits add column if not exists capacites text;
alter table fruits add column if not exists lore text;
alter table fruits add column if not exists statut text;
alter table fruits add column if not exists ancien_detenteur text;

-- Reprend l'ancienne photo unique dans le nouveau tableau photos[], pour ne rien perdre.
update fruits set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
