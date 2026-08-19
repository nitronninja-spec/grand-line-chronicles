-- Grand Line Chronicles — migration #18 :
--   • DS (despas) : nouveaux champs Code / Classe / Statut / Modificateur / Ancien détenteur / Capacités
--   • PDS : nouvelle table, entièrement séparée des DS
-- À exécuter dans Supabase (SQL Editor).

-- DS — champs additionnels (la table "despas" existante devient la page /despa)
alter table despas add column if not exists code text;
alter table despas add column if not exists classe text;
alter table despas add column if not exists statut text;
alter table despas add column if not exists modificateur text;
alter table despas add column if not exists ancien_detenteur text;
alter table despas add column if not exists capacites text;

-- PDS — être vivant porteur d'une anomalie, jamais fusionné avec les DS
create table if not exists pds (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code text,
  type text,
  classe text,
  statut text,
  hereditaire boolean default false,
  emoji text,
  color text,
  photos text[],
  pouvoir text,
  faiblesse text,
  objectif_etude text,
  despas_derives text[],
  sujet_nom text,
  sujet_statut text,
  sujet_photos text[],
  sujet_biographie text,
  sujet_notes text,
  created_at timestamptz default now()
);

alter table pds enable row level security;
create policy "public access pds" on pds for all using (true) with check (true);
