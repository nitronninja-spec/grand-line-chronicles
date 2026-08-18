-- Grand Line Chronicles — migration #8 :
--   • Personnages : condition de la prime, titre mondial (Empereur/Amiral/Vice-Amiral)
-- À exécuter dans Supabase (SQL Editor).

alter table personnages add column if not exists condition_prime text default 'mort_ou_vif';
alter table personnages add column if not exists titre_mondial text default '';
