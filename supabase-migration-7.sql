-- Grand Line Chronicles — migration #7 :
--   • Journaux (ex-Campagne) : photos, PDFs, personnages liés
--   • Lore : images
-- À exécuter dans Supabase (SQL Editor). Les deux tables sont vides,
-- donc aucun backfill n'est nécessaire.

-- Journaux (table "sessions", inchangée — seul l'habillage devient "Journaux")
alter table sessions add column if not exists photos text[] default '{}'::text[];
alter table sessions add column if not exists pdfs jsonb default '[]'::jsonb;
alter table sessions add column if not exists personnages text[] default '{}'::text[];

-- Lore : galerie d'images (la première sert de couverture)
alter table lore add column if not exists photos text[] default '{}'::text[];
