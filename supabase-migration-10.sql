-- Grand Line Chronicles — migration #10 :
--   • Nouvelle table faction_relations (alliance / ennemie / neutre entre deux factions)
--   • Position mémorisée des factions sur le schéma de relations (rel_x, rel_y en %)
-- À exécuter dans Supabase (SQL Editor).

create table if not exists faction_relations (
  id uuid primary key default gen_random_uuid(),
  faction_a text not null,
  faction_b text not null,
  type text not null default 'neutre',
  note text default '',
  created_at timestamptz default now()
);

alter table factions add column if not exists rel_x numeric;
alter table factions add column if not exists rel_y numeric;
