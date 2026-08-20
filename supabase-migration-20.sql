-- Grand Line Chronicles — migration #20 :
--   • Taxonomies configurables : table générique "categories" (content_type + dimension)
--   • Seed intégral des valeurs actuellement codées en dur dans chaque page, pour que la
--     future section Dashboard → Personnalisation reflète immédiatement l'état réel du site.
--   • Aucune table existante n'est modifiée — chaque fiche continue de stocker sa valeur en
--     texte brut (fruits.type, despas.classe, etc.), "categories" ne fait que cataloguer les
--     valeurs valides, leur ordre, couleur et icône.
-- À exécuter dans Supabase (SQL Editor).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  dimension text not null default 'categorie',
  value text not null,
  label text,
  emoji text,
  color text,
  cap integer,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists categories_type_dim_value_uniq
  on categories(content_type, dimension, value);

alter table categories enable row level security;

drop policy if exists "public access categories" on categories;
create policy "public access categories" on categories for all using (true) with check (true);

-- ─── Fruits ──────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('fruits', 'type', 'Paramecia', 'Paramecia', '🔮', '#40d060', 0),
  ('fruits', 'type', 'Logia', 'Logia', '🌪️', '#ff8c40', 1),
  ('fruits', 'type', 'Zoan', 'Zoan', '🐾', '#a060ff', 2),
  ('fruits', 'type', 'Mythical', 'Mythical Zoan', '✨', '#d4a017', 3),
  ('fruits', 'type', 'Inconnu', 'Inconnu', '❓', '#7a9ab8', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('fruits', 'statut', 'mange', 'Mangé', '🍽️', '#e03030', 0),
  ('fruits', 'statut', 'perdu', 'Perdu', '❓', '#a0a0c0', 1),
  ('fruits', 'statut', 'stocke', 'Stocké', '📦', '#00c8ff', 2)
on conflict do nothing;

-- ─── Lames ───────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, cap, ordre) values
  ('lames', 'rang', 'Grande Lame', 'Grande Lame', '🔪', '#5a6a78', 200, 0),
  ('lames', 'rang', 'Lame de qualité', 'Lame de qualité', '🗡️', '#7a9ab8', 100, 1),
  ('lames', 'rang', 'Lame de Grande qualité', 'Lame de Grande qualité', '⚔️', '#00c8ff', 50, 2),
  ('lames', 'rang', 'Lame de 1er Ordre', 'Lame de 1er Ordre', '🔱', '#a060ff', 20, 3),
  ('lames', 'rang', 'Lame Légendaire', 'Lame Légendaire', '✨', '#d4a017', 10, 4)
on conflict do nothing;

-- ─── DS (despas) ─────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'type', 'Cristallin', 'Cristallin', '#7c5cff', 0),
  ('despa', 'type', 'Biologique', 'Biologique', '#7c5cff', 1),
  ('despa', 'type', 'Hybride', 'Hybride', '#7c5cff', 2),
  ('despa', 'type', 'Technologique', 'Technologique', '#7c5cff', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'classe', 'C', 'C', '#7a9ab8', 0),
  ('despa', 'classe', 'B', 'B', '#40d060', 1),
  ('despa', 'classe', 'A', 'A', '#00c8ff', 2),
  ('despa', 'classe', 'S', 'S', '#a060ff', 3),
  ('despa', 'classe', 'SS', 'SS', '#d4a017', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'statut', 'Actif', 'Actif', '#40d060', 0),
  ('despa', 'statut', 'Perdu', 'Perdu', '#a0a0c0', 1),
  ('despa', 'statut', 'Inachevé', 'Inachevé', '#f0c040', 2),
  ('despa', 'statut', 'En Stase', 'En Stase', '#00c8ff', 3),
  ('despa', 'statut', 'Contrôlé', 'Contrôlé', '#e03030', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('despa', 'modificateur', 'Aucun', 'Aucun', '#7a9ab8', 0),
  ('despa', 'modificateur', 'Consommable', 'Consommable', '#40d060', 1),
  ('despa', 'modificateur', 'Limité', 'Limité', '#ff8c40', 2)
on conflict do nothing;

-- ─── PDS ─────────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'type', 'Résonance', 'Résonance', '#40d060', 0),
  ('pds', 'type', 'Mutationnel', 'Mutationnel', '#40d060', 1),
  ('pds', 'type', 'Bestial', 'Bestial', '#40d060', 2),
  ('pds', 'type', 'Héritage', 'Héritage', '#40d060', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'classe', 'C', 'C', '#7a9ab8', 0),
  ('pds', 'classe', 'B', 'B', '#40d060', 1),
  ('pds', 'classe', 'A', 'A', '#00c8ff', 2),
  ('pds', 'classe', 'S', 'S', '#a060ff', 3),
  ('pds', 'classe', 'SS', 'SS', '#d4a017', 4)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('pds', 'statut', 'Actif', 'Actif', '#40d060', 0),
  ('pds', 'statut', 'Perdu', 'Perdu', '#a0a0c0', 1),
  ('pds', 'statut', 'En Stase', 'En Stase', '#00c8ff', 2),
  ('pds', 'statut', 'En fuite', 'En fuite', '#ff8c40', 3),
  ('pds', 'statut', 'Neutralisé', 'Neutralisé', '#e03030', 4),
  ('pds', 'statut', 'Inconnu', 'Inconnu', '#7a9ab8', 5)
on conflict do nothing;

-- ─── Personnages ─────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('personnages', 'type', 'pj', 'Joueurs', '#00c8ff', 0),
  ('personnages', 'type', 'pnj', 'PNJ', '#d4a017', 1),
  ('personnages', 'type', 'allié', 'Alliés', '#40d060', 2),
  ('personnages', 'type', 'antagoniste', 'Antagonistes', '#e03030', 3),
  ('personnages', 'type', 'ambivalent', 'Ambivalents', '#a060ff', 4),
  ('personnages', 'type', 'inconnu', 'Inconnus', '#7a9ab8', 5)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, color, ordre) values
  ('personnages', 'statut', 'vivant', 'Vivant', '#40d060', 0),
  ('personnages', 'statut', 'mort', 'Mort', '#ff6060', 1),
  ('personnages', 'statut', 'disparu', 'Disparu', '#ffb060', 2),
  ('personnages', 'statut', 'inconnu', 'Inconnu', '#a0a0c0', 3)
on conflict do nothing;

insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('personnages', 'titre_mondial', 'Empereur', 'Empereur', '👑', '#e03030', 0),
  ('personnages', 'titre_mondial', 'Empereur Déchu', 'Empereur Déchu', '👑', '#8a5a3a', 1),
  ('personnages', 'titre_mondial', 'Amiral', 'Amiral', '⚓', '#00c8ff', 2),
  ('personnages', 'titre_mondial', 'Amiral Déchu', 'Amiral Déchu', '⚓', '#5a7a8a', 3),
  ('personnages', 'titre_mondial', 'Shichibukai', 'Shichibukai', '🗡️', '#a060ff', 4),
  ('personnages', 'titre_mondial', 'Shichibukai Déchu', 'Shichibukai Déchu', '🗡️', '#6a4a7a', 5),
  ('personnages', 'titre_mondial', 'Dragon Céleste', 'Dragon Céleste', '🫧', '#f0c040', 6)
on conflict do nothing;

-- ─── Factions ────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('factions', 'type', 'Pirates', 'Pirates', '🏴‍☠️', '#d4a017', 0),
  ('factions', 'type', 'Marine', 'Marine', '⚓', '#00c8ff', 1),
  ('factions', 'type', 'Gouvernement', 'Gouvernement', '🏛️', '#4488ff', 2),
  ('factions', 'type', 'Révolutionnaire', 'Révolutionnaire', '✊', '#e03030', 3),
  ('factions', 'type', 'Peuple', 'Peuple', '👥', '#40e0a0', 4),
  ('factions', 'type', 'Neutre', 'Neutre', '🤝', '#7a9ab8', 5),
  ('factions', 'type', 'Autre', 'Autre', '⚔️', '#a060ff', 6)
on conflict do nothing;

-- ─── Îles ────────────────────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, color, ordre) values
  ('iles', 'region', 'East Blue', 'East Blue', '#00c8ff', 0),
  ('iles', 'region', 'West Blue', 'West Blue', '#4488ff', 1),
  ('iles', 'region', 'North Blue', 'North Blue', '#a060ff', 2),
  ('iles', 'region', 'South Blue', 'South Blue', '#40d060', 3),
  ('iles', 'region', 'Grand Line', 'Grand Line', '#d4a017', 4),
  ('iles', 'region', 'Red Line', 'Red Line', '#ff8c40', 5),
  ('iles', 'region', 'New World', 'New World', '#e03030', 6),
  ('iles', 'region', 'Région inconnue', 'Région inconnue', '#7a9ab8', 7)
on conflict do nothing;

-- ─── Journaux (sessions) ─────────────────────────────────────────────────
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('journaux', 'categorie', 'Le Hérault', 'Le Hérault', '📰', '#d4a017', 0),
  ('journaux', 'categorie', 'Marine News', 'Marine News', '⚓', '#3f7fe0', 1)
on conflict do nothing;

-- ─── Lore ────────────────────────────────────────────────────────────────
-- "Magie" est volontairement omise : 0 fiche l'utilise et l'univers repose sur le Haki,
-- pas la magie (cf. demande de nettoyage de Matéis).
insert into categories (content_type, dimension, value, label, emoji, color, ordre) values
  ('lore', 'categorie', 'histoire', 'Histoire', '📜', '#d4a017', 0),
  ('lore', 'categorie', 'geographie', 'Géographie', '🌍', '#00c8ff', 1),
  ('lore', 'categorie', 'personnage', 'Personnage', '👤', '#40d060', 2),
  ('lore', 'categorie', 'faction', 'Faction', '⚔️', '#e03030', 3),
  ('lore', 'categorie', 'divers', 'Divers', '📌', '#7a9ab8', 4)
on conflict do nothing;

-- ─── Cristaux ────────────────────────────────────────────────────────────
-- Aucune valeur en dur à seeder ici : la page dérivait déjà ses catégories des fiches
-- existantes (aucune fiche en base actuellement). La Personnalisation permettra d'en
-- ajouter directement ; la page continuera de proposer aussi la saisie libre existante.
