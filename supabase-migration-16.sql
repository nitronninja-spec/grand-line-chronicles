-- Grand Line Chronicles — migration #16 :
--   • Fruits : champ "Prix"
--   • Lames : "Ancien détenteur", champ "Prix", plusieurs images (photos[])
--   • Cristaux : champ "Prix", plusieurs images (photos[])
--   • Despas, Îles, Factions : plusieurs images (photos[])
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists prix text;

alter table lames add column if not exists ancien_detenteur text;
alter table lames add column if not exists prix text;
alter table lames add column if not exists photos text[];

alter table cristaux_primordiaux add column if not exists prix text;
alter table cristaux_primordiaux add column if not exists photos text[];

alter table despas add column if not exists photos text[];

alter table iles add column if not exists photos text[];

alter table factions add column if not exists photos text[];

-- Reprend chaque ancienne photo unique dans le nouveau tableau photos[], pour ne rien perdre.
update lames set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update cristaux_primordiaux set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update despas set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
update iles set photos = array[photo] where photo is not null and photo <> '' and (photos is null or array_length(photos, 1) is null);
