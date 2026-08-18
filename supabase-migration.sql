-- Grand Line Chronicles — migration pour : Despas, Lames, Cristaux Primordiaux,
-- lien Personnage -> Île, lien Île -> Faction.
-- À exécuter dans Supabase (SQL Editor) avant de tester les nouvelles pages.

-- 1) Liens entre tables existantes
alter table personnages add column if not exists ile text;
alter table iles add column if not exists faction text;

-- 2) Despas — prothèses artificielles (équivalent technologique des Fruits)
create table if not exists despas (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text,
  puissance int,
  emoji text,
  description text,
  cout text,
  proprietaire text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- 3) Lames — sabres et armes blanches nommées
create table if not exists lames (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  jp text,
  rang text,
  puissance int,
  emoji text,
  description text,
  proprietaire text,
  particularites text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- 4) Cristaux Primordiaux
create table if not exists cristaux_primordiaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  element text,
  puissance int,
  emoji text,
  description text,
  proprietaire text,
  instabilite text,
  color text,
  photo text,
  created_at timestamptz default now()
);

-- 5) RLS — ouvre l'accès public (lecture/écriture) comme les autres tables du projet.
-- Si tes tables existantes (fruits, iles...) utilisent des règles différentes,
-- adapte ces policies en conséquence avant de les exécuter.
alter table despas enable row level security;
alter table lames enable row level security;
alter table cristaux_primordiaux enable row level security;

create policy "public access despas" on despas for all using (true) with check (true);
create policy "public access lames" on lames for all using (true) with check (true);
create policy "public access cristaux_primordiaux" on cristaux_primordiaux for all using (true) with check (true);
