-- ============================================================================
-- Grand Line Chronicles — structure de la base MySQL / MariaDB (O2switch)
-- ============================================================================
-- À importer UNE fois dans phpMyAdmin (cPanel > phpMyAdmin > ta base > onglet Importer),
-- AVANT le fichier de données produit par `npm run migrer`.
--
-- Correspondances avec l'ancienne base Supabase (PostgreSQL) :
--   • uuid            → CHAR(36)   (généré par l'API PHP à l'insertion)
--   • text[] / jsonb  → JSON       (l'API renvoie de vrais tableaux / objets)
--   • timestamptz     → DATETIME(6) en UTC (l'API renvoie de l'ISO 8601)
--   • boolean         → TINYINT(1) (l'API renvoie true / false)
-- Pour ajouter une colonne plus tard : un fichier `serveur/migration-N.sql` à exécuter à la main
-- dans phpMyAdmin (onglet SQL), comme avant avec Supabase. L'API détecte seule les nouvelles colonnes.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS personnages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  surnom TEXT,
  emoji TEXT,
  photos JSON,
  type TEXT,
  equipage TEXT,
  prime TEXT,
  origine TEXT,
  statut TEXT,
  fruit TEXT,
  tags TEXT,
  description LONGTEXT,
  historique LONGTEXT,
  techniques LONGTEXT,
  gdoc TEXT,
  miro TEXT,
  fav TINYINT(1) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  ile TEXT,
  rang TEXT,
  factions JSON,
  condition_prime TEXT DEFAULT 'mort_ou_vif',
  titre_mondial TEXT DEFAULT '',
  rangs JSON,
  ordre_manuel INT,
  haki JSON,
  iles_liees JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lames (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  jp TEXT,
  rang TEXT,
  puissance INT,
  emoji TEXT,
  description LONGTEXT,
  proprietaire TEXT,
  particularites LONGTEXT,
  color TEXT,
  photo TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  ancien_detenteur TEXT,
  prix TEXT,
  photos JSON,
  capacites LONGTEXT,
  lore LONGTEXT,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fruits (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  jp TEXT,
  type TEXT,
  puissance INT,
  emoji TEXT,
  description LONGTEXT,
  proprietaire TEXT,
  color TEXT,
  photo TEXT,
  faiblesses LONGTEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  photos JSON,
  capacites LONGTEXT,
  lore LONGTEXT,
  statut TEXT,
  ancien_detenteur TEXT,
  prix TEXT,
  ordre_manuel INT,
  -- Une lame peut "manger" un fruit : si la lame est supprimée, le lien s'efface.
  lame_id CHAR(36),
  CONSTRAINT fruits_lame_fk FOREIGN KEY (lame_id) REFERENCES lames(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS despas (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT,
  puissance INT,
  emoji TEXT,
  description LONGTEXT,
  cout TEXT,
  proprietaire TEXT,
  color TEXT,
  photo TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  photos JSON,
  code TEXT,
  classe TEXT,
  statut TEXT,
  modificateur TEXT,
  ancien_detenteur TEXT,
  capacites LONGTEXT,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  code TEXT,
  type TEXT,
  classe TEXT,
  statut TEXT,
  hereditaire TINYINT(1) DEFAULT 0,
  emoji TEXT,
  color TEXT,
  photos JSON,
  pouvoir LONGTEXT,
  faiblesse LONGTEXT,
  objectif_etude LONGTEXT,
  despas_derives JSON,
  sujet_nom TEXT,
  sujet_statut TEXT,
  sujet_photos JSON,
  sujet_biographie LONGTEXT,
  sujet_notes LONGTEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cristaux_primordiaux (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  categorie TEXT,
  puissance INT,
  emoji TEXT,
  description LONGTEXT,
  proprietaire TEXT,
  instabilite TEXT,
  color TEXT,
  photo TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  prix TEXT,
  photos JSON,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS iles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  emoji TEXT,
  region TEXT,
  climat TEXT,
  description LONGTEXT,
  photo TEXT,
  gdoc TEXT,
  miro TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  chef TEXT,
  est_archipel TINYINT(1) DEFAULT 0,
  factions JSON,
  iles_parentes JSON,
  est_detruite TINYINT(1) DEFAULT 0,
  photos JSON,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nom TEXT NOT NULL,
  emoji TEXT,
  type TEXT,
  description LONGTEXT,
  gdoc TEXT,
  miro TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  rangs JSON,
  rel_x DOUBLE,
  rel_y DOUBLE,
  est_dossier TINYINT(1) DEFAULT 0,
  factions_parentes JSON,
  couleur TEXT,
  ordre_manuel INT,
  photos JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faction_relations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  faction_a TEXT NOT NULL,
  faction_b TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'neutre',
  note TEXT DEFAULT '',
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "sessions" = les Journaux de campagne.
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  num INT,
  titre TEXT NOT NULL,
  date DATE,
  lieu TEXT,
  resume LONGTEXT,
  gdoc TEXT,
  miro TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  photos JSON,
  pdfs JSON,
  personnages JSON,
  categorie TEXT,
  scene LONGTEXT,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lore (
  id CHAR(36) NOT NULL PRIMARY KEY,
  titre TEXT NOT NULL,
  categorie TEXT,
  contenu LONGTEXT,
  emoji TEXT,
  tags TEXT,
  modifie DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  photos JSON,
  ordre_manuel INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  content_type VARCHAR(100) NOT NULL,
  dimension VARCHAR(100) NOT NULL DEFAULT 'categorie',
  value VARCHAR(190) NOT NULL,
  label TEXT,
  emoji TEXT,
  color TEXT,
  cap INT,
  ordre INT NOT NULL DEFAULT 0,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY categories_type_dim_value_uniq (content_type, dimension, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
