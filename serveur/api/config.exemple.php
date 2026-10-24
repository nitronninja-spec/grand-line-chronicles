<?php
// Copier ce fichier en "config.php" (dans le même dossier api/) et remplir avec les infos
// de la base créée dans cPanel > Bases de données MySQL. config.php n'est jamais commité
// et n'est jamais écrasé par `npm run export`.
return [
  'db_host' => 'localhost',
  'db_name' => 'NOMCPANEL_glc',      // nom complet de la base (préfixé par ton identifiant cPanel)
  'db_user' => 'NOMCPANEL_glc',      // utilisateur MySQL associé à la base
  'db_pass' => 'mot-de-passe-ici',

  // Adresse publique du dossier media/ (pour les URL des images envoyées).
  // '/media' convient quand le site est à la racine du domaine.
  'media_url' => '/media',

  // Origines autorisées à appeler l'API depuis un autre domaine (ex. 'http://localhost:3000'
  // pour développer en local contre la vraie base). Vide = même domaine uniquement.
  'cors_origins' => [],
];
