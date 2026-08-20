-- Grand Line Chronicles — migration #22 :
--   • Relation Fruit ↔ Lame ("mangé par") : un fruit peut être lié à la lame qui l'a
--     consommé. Couplé au statut du fruit côté application (lier passe le fruit à "Mangé"
--     et vide son propriétaire), pas de trigger SQL — géré dans fruits/page.tsx.
-- À exécuter dans Supabase (SQL Editor).

alter table fruits add column if not exists lame_id uuid references lames(id) on delete set null;
