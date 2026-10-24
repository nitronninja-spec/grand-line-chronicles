<?php
// Réception d'un fichier (photo ou PDF) envoyé par uploadRawFile() (src/lib/db.ts).
// POST multipart : champ "file" + champ "folder" (personnages, iles, journaux...).
// Le fichier est rangé dans media/<folder>/<horodatage>.<ext> à côté du site et l'URL publique
// est renvoyée : { url } ou { error: { message } }.
require __DIR__ . '/_commun.php';

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'pdf'];
const TAILLE_MAX = 25 * 1024 * 1024;

entetes_cors();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') repondre_erreur('Méthode non autorisée', 405);

$f = $_FILES['file'] ?? null;
if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  $code = $f['error'] ?? UPLOAD_ERR_NO_FILE;
  repondre_erreur($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE
    ? 'Fichier trop lourd pour le serveur (augmenter upload_max_filesize dans cPanel > Sélectionner une version de PHP > Options)'
    : "Fichier non reçu (code $code)");
}
if ($f['size'] > TAILLE_MAX) repondre_erreur('Fichier trop lourd (25 Mo max)');

$ext = strtolower(pathinfo($f['name'] ?? '', PATHINFO_EXTENSION));
if (!in_array($ext, EXTENSIONS, true)) repondre_erreur("Type de fichier refusé (.$ext)");

$dossier = preg_replace('/[^a-z0-9_-]/i', '', $_POST['folder'] ?? '') ?: 'general';
$racine = dirname(__DIR__) . '/media';
if (!is_dir("$racine/$dossier") && !mkdir("$racine/$dossier", 0755, true)) repondre_erreur('Impossible de créer le dossier media/', 500);

// Même nommage que l'ancien bucket Supabase ; suffixe aléatoire contre deux envois la même milliseconde.
$nom = (int)round(microtime(true) * 1000) . '-' . bin2hex(random_bytes(3)) . ".$ext";
if (!move_uploaded_file($f['tmp_name'], "$racine/$dossier/$nom")) repondre_erreur("Impossible d'enregistrer le fichier", 500);

repondre(['url' => rtrim(config()['media_url'] ?? '/media', '/') . "/$dossier/$nom", 'error' => null]);
