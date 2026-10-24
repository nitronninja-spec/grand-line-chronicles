<?php
// Point d'entrée unique des lectures / écritures du site (remplace l'API REST de Supabase).
// Reçoit en POST un JSON construit par src/lib/db.ts :
//   { table, action: select|insert|update|delete, columns, filters: [[col, op, valeur]],
//     order: [[col, ascendant, nullsFirst]], limit, offset, count, head, single, values, returning }
// Répond { data, count, error } comme supabase-js, pour que les pages n'aient presque pas changé.
// Les noms de tables / colonnes sont vérifiés contre la vraie structure de la base ; les valeurs
// passent toujours par des requêtes préparées.
require __DIR__ . '/_commun.php';

entetes_cors();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') repondre_erreur('Méthode non autorisée', 405);

$req = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($req)) repondre_erreur('Requête JSON invalide');

$table = $req['table'] ?? '';
if (!in_array($table, TABLES_AUTORISEES, true)) repondre_erreur("Table inconnue « $table »");
$cols = colonnes($table);

try {
  switch ($req['action'] ?? 'select') {
    case 'select': repondre(faire_select($table, $cols, $req));
    case 'insert': repondre(faire_insert($table, $cols, $req));
    case 'update': repondre(faire_update($table, $cols, $req));
    case 'delete': repondre(faire_delete($table, $cols, $req));
    default: repondre_erreur('Action inconnue');
  }
} catch (PDOException $e) {
  repondre_erreur($e->getMessage());
}

// ─── Structure ──────────────────────────────────────────────────────────────

// nom de colonne => json | bool | int | float | datetime | date | text
function colonnes(string $table): array {
  $st = pdo()->prepare('SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');
  $st->execute([$table]);
  $lignes = $st->fetchAll();
  if (!$lignes) repondre_erreur("La table « $table » n'existe pas dans la base (schema.sql importé ?)", 500);

  // MariaDB (O2switch) stocke JSON en LONGTEXT + contrainte json_valid() ; MySQL 8 a un vrai type json.
  $json = [];
  try {
    $st = pdo()->prepare('SELECT CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS
                          WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $st->execute([$table]);
    foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $clause) {
      if (preg_match('/json_valid\(`?(\w+)`?\)/i', $clause, $m)) $json[$m[1]] = true;
    }
  } catch (PDOException $e) { /* MySQL : pas de TABLE_NAME dans cette vue, DATA_TYPE suffit */ }

  $res = [];
  foreach ($lignes as $l) {
    $nom = $l['COLUMN_NAME'];
    $t = strtolower($l['DATA_TYPE']);
    $res[$nom] = match (true) {
      $t === 'json' || isset($json[$nom]) => 'json',
      $t === 'tinyint' && str_starts_with(strtolower($l['COLUMN_TYPE']), 'tinyint(1)') => 'bool',
      in_array($t, ['int', 'integer', 'bigint', 'smallint', 'mediumint', 'tinyint'], true) => 'int',
      in_array($t, ['double', 'float', 'decimal', 'real'], true) => 'float',
      in_array($t, ['datetime', 'timestamp'], true) => 'datetime',
      $t === 'date' => 'date',
      default => 'text',
    };
  }
  return $res;
}

function verifier_colonne(array $cols, mixed $c, string $table): string {
  if (!is_string($c) || !array_key_exists($c, $cols)) repondre_erreur("Colonne inconnue « " . (is_string($c) ? $c : '?') . " » dans la table $table");
  return $c;
}

// ─── Conversions PHP <-> MySQL ──────────────────────────────────────────────

function vers_sql(string $type, mixed $v): mixed {
  if ($v === null) return null;
  switch ($type) {
    case 'json': return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    case 'bool': return ($v === true || $v === 1 || $v === '1' || $v === 'true') ? 1 : 0;
    case 'int': return $v === '' ? null : (is_bool($v) ? (int)$v : $v);
    case 'float': return $v === '' ? null : $v;
    case 'datetime':
      if ($v === '') return null;
      try { return (new DateTime((string)$v))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'); }
      catch (Exception $e) { repondre_erreur("Date invalide : $v"); }
    case 'date': return $v === '' ? null : substr((string)$v, 0, 10);
    default: return is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : (is_bool($v) ? ($v ? 'true' : 'false') : $v);
  }
}

function depuis_sql(array $cols, array $ligne): array {
  foreach ($ligne as $c => $v) {
    if ($v === null) continue;
    $ligne[$c] = match ($cols[$c] ?? 'text') {
      'json' => json_decode($v, true),
      'bool' => (bool)$v,
      'int' => (int)$v,
      'float' => (float)$v,
      // Même format que PostgreSQL : "2026-08-19T21:06:18.10516+00:00" (zéros finaux retirés).
      'datetime' => preg_replace('/\.?0+$/', '', str_replace(' ', 'T', $v)) . '+00:00',
      default => $v,
    };
  }
  return $ligne;
}

// ─── Morceaux de requête ────────────────────────────────────────────────────

function clause_where(string $table, array $cols, array $filtres, array &$params): string {
  $parts = [];
  foreach ($filtres as $f) {
    if (!is_array($f) || count($f) < 3) repondre_erreur('Filtre invalide');
    [$c, $op, $v] = $f;
    $c = verifier_colonne($cols, $c, $table);
    $nier = false;
    if (str_starts_with((string)$op, 'not.')) { $nier = true; $op = substr($op, 4); }
    $q = "`$c`";
    $type = $cols[$c];
    switch ($op) {
      case 'eq': case 'neq': case 'gt': case 'gte': case 'lt': case 'lte':
        if ($v === null) { $expr = $op === 'neq' ? "$q IS NOT NULL" : "$q IS NULL"; break; }
        $sym = ['eq' => '=', 'neq' => '<>', 'gt' => '>', 'gte' => '>=', 'lt' => '<', 'lte' => '<='][$op];
        $expr = "$q $sym ?"; $params[] = vers_sql($type === 'json' ? 'text' : $type, $v); break;
      case 'like':
        $expr = "$q LIKE BINARY ?"; $params[] = (string)$v; break;
      case 'ilike':
        $expr = "LOWER($q) LIKE LOWER(?)"; $params[] = (string)$v; break;
      case 'is':
        $expr = $v === null ? "$q IS NULL" : "$q = " . ($v ? 1 : 0); break;
      case 'in':
        if (!is_array($v) || !$v) { $expr = '0'; break; }
        $expr = "$q IN (" . implode(',', array_fill(0, count($v), '?')) . ')';
        foreach ($v as $x) $params[] = vers_sql($type, $x);
        break;
      case 'contains':
        $expr = "JSON_CONTAINS($q, ?)"; $params[] = json_encode($v, JSON_UNESCAPED_UNICODE); break;
      default: repondre_erreur("Opérateur inconnu « $op »");
    }
    $parts[] = $nier ? "NOT ($expr)" : $expr;
  }
  return $parts ? ' WHERE ' . implode(' AND ', $parts) : '';
}

function clause_order(string $table, array $cols, array $ordres): string {
  $parts = [];
  foreach ($ordres as $o) {
    $c = verifier_colonne($cols, $o[0] ?? null, $table);
    $asc = ($o[1] ?? true) !== false;
    // Comme PostgreSQL : les NULL en dernier en ordre croissant, en premier en décroissant.
    $nullsFirst = isset($o[2]) && $o[2] !== null ? (bool)$o[2] : !$asc;
    $parts[] = "(`$c` IS NULL) " . ($nullsFirst ? 'DESC' : 'ASC');
    $parts[] = "`$c` " . ($asc ? 'ASC' : 'DESC');
  }
  return $parts ? ' ORDER BY ' . implode(', ', $parts) : '';
}

function liste_colonnes(string $table, array $cols, mixed $sel): string {
  $sel = trim((string)($sel ?: '*'));
  if ($sel === '*') return '*';
  $noms = array_map('trim', explode(',', $sel));
  return implode(', ', array_map(fn($c) => '`' . verifier_colonne($cols, $c, $table) . '`', $noms));
}

function lire(string $table, array $cols, string $where, array $params, string $order = '', string $limite = '', string $sel = '*'): array {
  $st = pdo()->prepare("SELECT $sel FROM `$table`$where$order$limite");
  $st->execute($params);
  return array_map(fn($l) => depuis_sql($cols, $l), $st->fetchAll());
}

function lire_ids(string $table, array $cols, array $ids, mixed $sel): array {
  if (!$ids) return [];
  $lignes = lire($table, $cols, ' WHERE `id` IN (' . implode(',', array_fill(0, count($ids), '?')) . ')', $ids, '', '', liste_colonnes($table, $cols, $sel));
  $parId = [];
  foreach ($lignes as $l) $parId[$l['id'] ?? ''] = $l;
  // Garde l'ordre des ids (ordre d'insertion) ; si "id" n'est pas sélectionné, ordre de la base.
  return isset($lignes[0]['id']) ? array_values(array_filter(array_map(fn($i) => $parId[$i] ?? null, $ids))) : $lignes;
}

function appliquer_single(array $req, array $resultat): array {
  $mode = $req['single'] ?? null;
  if (!$mode) return $resultat;
  $n = count($resultat['data'] ?? []);
  if ($n > 1 || ($n === 0 && $mode === 'single')) {
    return ['data' => null, 'count' => $resultat['count'], 'error' => ['message' => "Une seule ligne attendue, $n reçue(s)", 'code' => 'PGRST116']];
  }
  $resultat['data'] = $resultat['data'][0] ?? null;
  return $resultat;
}

function uuid4(): string {
  $b = random_bytes(16);
  $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
  $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

// ─── Actions ────────────────────────────────────────────────────────────────

function faire_select(string $table, array $cols, array $req): array {
  $params = [];
  $where = clause_where($table, $cols, $req['filters'] ?? [], $params);
  $count = null;
  if (!empty($req['count'])) {
    $st = pdo()->prepare("SELECT COUNT(*) FROM `$table`$where");
    $st->execute($params);
    $count = (int)$st->fetchColumn();
  }
  if (!empty($req['head'])) return ['data' => null, 'count' => $count, 'error' => null];
  $limite = '';
  if (isset($req['limit'])) $limite = ' LIMIT ' . max(0, (int)$req['limit']) . (isset($req['offset']) ? ' OFFSET ' . max(0, (int)$req['offset']) : '');
  $data = lire($table, $cols, $where, $params, clause_order($table, $cols, $req['order'] ?? []), $limite, liste_colonnes($table, $cols, $req['columns'] ?? '*'));
  return appliquer_single($req, ['data' => $data, 'count' => $count, 'error' => null]);
}

function faire_insert(string $table, array $cols, array $req): array {
  $lignes = $req['values'] ?? null;
  if (!is_array($lignes) || !$lignes) repondre_erreur('Rien à insérer');
  if (!array_is_list($lignes)) $lignes = [$lignes];
  $ids = [];
  $pdo = pdo();
  $pdo->beginTransaction();
  try {
    foreach ($lignes as $ligne) {
      if (!is_array($ligne)) repondre_erreur('Ligne invalide');
      if (empty($ligne['id'])) $ligne['id'] = uuid4();
      $noms = []; $vals = [];
      foreach ($ligne as $c => $v) {
        $noms[] = '`' . verifier_colonne($cols, $c, $table) . '`';
        $vals[] = vers_sql($cols[$c], $v);
      }
      $st = $pdo->prepare("INSERT INTO `$table` (" . implode(', ', $noms) . ') VALUES (' . implode(', ', array_fill(0, count($vals), '?')) . ')');
      $st->execute($vals);
      $ids[] = $ligne['id'];
    }
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
  $data = !empty($req['returning']) ? lire_ids($table, $cols, $ids, $req['columns'] ?? '*') : null;
  return appliquer_single($req, ['data' => $data, 'count' => null, 'error' => null]);
}

// Les ids visés sont relevés avant l'écriture : ça permet de renvoyer les lignes modifiées
// (même si la modification change la colonne filtrée) et de refuser un UPDATE/DELETE sans filtre.
function ids_vises(string $table, array $cols, array $req): array {
  if (empty($req['filters'])) repondre_erreur('Modification sans filtre refusée (ajouter .eq(...))');
  $params = [];
  $where = clause_where($table, $cols, $req['filters'], $params);
  $st = pdo()->prepare("SELECT `id` FROM `$table`$where");
  $st->execute($params);
  return $st->fetchAll(PDO::FETCH_COLUMN);
}

function faire_update(string $table, array $cols, array $req): array {
  $valeurs = $req['values'] ?? null;
  if (!is_array($valeurs) || !$valeurs || array_is_list($valeurs)) repondre_erreur('Rien à modifier');
  foreach (array_keys($valeurs) as $c) verifier_colonne($cols, $c, $table);
  $ids = ids_vises($table, $cols, $req);
  if ($ids) {
    $sets = []; $params = [];
    foreach ($valeurs as $c => $v) {
      $sets[] = '`' . verifier_colonne($cols, $c, $table) . '` = ?';
      $params[] = vers_sql($cols[$c], $v);
    }
    $st = pdo()->prepare("UPDATE `$table` SET " . implode(', ', $sets) . ' WHERE `id` IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
    $st->execute(array_merge($params, $ids));
  }
  $data = !empty($req['returning']) ? lire_ids($table, $cols, $ids, $req['columns'] ?? '*') : null;
  return appliquer_single($req, ['data' => $data, 'count' => null, 'error' => null]);
}

function faire_delete(string $table, array $cols, array $req): array {
  $ids = ids_vises($table, $cols, $req);
  $data = !empty($req['returning']) ? lire_ids($table, $cols, $ids, $req['columns'] ?? '*') : null;
  if ($ids) {
    $st = pdo()->prepare("DELETE FROM `$table` WHERE `id` IN (" . implode(',', array_fill(0, count($ids), '?')) . ')');
    $st->execute($ids);
  }
  return appliquer_single($req, ['data' => $data, 'count' => null, 'error' => null]);
}
