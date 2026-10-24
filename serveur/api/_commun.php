<?php
// Code partagé par db.php et upload.php : configuration, connexion MySQL, réponses JSON.

const TABLES_AUTORISEES = [
  'personnages', 'fruits', 'despas', 'pds', 'lames', 'cristaux_primordiaux',
  'iles', 'factions', 'faction_relations', 'sessions', 'lore', 'categories',
];

function config(): array {
  static $cfg = null;
  if ($cfg === null) {
    $fichier = __DIR__ . '/config.php';
    if (!is_file($fichier)) repondre_erreur('config.php manquant dans le dossier api/ (copier config.exemple.php)', 500);
    $cfg = require $fichier;
  }
  return $cfg;
}

function entetes_cors(): void {
  $origine = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origine !== '' && in_array($origine, config()['cors_origins'] ?? [], true)) {
    header("Access-Control-Allow-Origin: $origine");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}

function repondre(array $corps, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($corps, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
  exit;
}

function repondre_erreur(string $message, int $code = 400): never {
  repondre(['data' => null, 'count' => null, 'error' => ['message' => $message]], $code);
}

function pdo(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $c = config();
    try {
      $pdo = new PDO("mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4", $c['db_user'], $c['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);
    } catch (PDOException $e) {
      repondre_erreur('Connexion à la base impossible : ' . $e->getMessage(), 500);
    }
    $pdo->exec("SET time_zone = '+00:00'");
  }
  return $pdo;
}
