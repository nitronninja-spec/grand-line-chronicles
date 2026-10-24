# Mettre le site sur O2switch (sans Supabase)

Tout tourne chez O2switch : les pages, la base de données (MySQL) et les images.
À faire **une seule fois** (étapes 1 à 5). Pour les mises à jour suivantes, voir tout en bas.

Fichiers prêts sur le PC, dans le dossier du projet :
- `serveur/schema.sql` : la structure de la base
- `o2switch-transfert/donnees.sql` : toutes les fiches (produit par `npm run migrer`)
- `o2switch-transfert/media.zip` : les 392 images utilisées (~100 Mo)
- `.next-export/` : le site complet (produit par `npm run export`)

## 1. Choisir PHP 8.2 ou plus
cPanel → **Sélectionner une version de PHP** → choisir **8.2** (ou plus récent) → Appliquer.
Dans l'onglet **Options** de la même page, vérifier `upload_max_filesize` ≥ 32M et `post_max_size` ≥ 40M.

## 2. Créer la base de données
1. cPanel → **Bases de données MySQL**.
2. « Créer une base » : par ex. `glc` → elle s'appellera `TONIDENTIFIANT_glc`.
3. « Ajouter un utilisateur » : par ex. `glc`, avec un mot de passe solide (le noter).
4. « Ajouter un utilisateur à la base » : choisir les deux → cocher **TOUS LES PRIVILÈGES**.

## 3. Remplir la base
cPanel → **phpMyAdmin** → cliquer sur la base `TONIDENTIFIANT_glc` à gauche → onglet **Importer** :
1. Importer `serveur/schema.sql` → Exécuter.
2. Importer `o2switch-transfert/donnees.sql` → Exécuter.

Vérification : la table `personnages` doit avoir 204 lignes.

## 4. Envoyer le site
cPanel → **Gestionnaire de fichiers** → dossier `public_html` (celui du domaine du site) :
1. Envoyer **le contenu** du dossier `.next-export/` (pas le dossier lui-même) : `index.html`,
   `_next/`, `api/`, `media/`, `personnages/`… Le plus simple : compresser ce contenu en zip sur le PC,
   l'envoyer, clic droit → **Extraire**.
2. Aller dans `public_html/media/`, envoyer `media.zip`, clic droit → **Extraire** ici, puis supprimer le zip.
   On doit obtenir `public_html/media/personnages/…`, `public_html/media/iles/…`, etc.

## 5. Brancher l'API sur la base
Dans `public_html/api/` : copier `config.exemple.php` en **`config.php`**, l'éditer et remplir
`db_name`, `db_user`, `db_pass` avec les infos de l'étape 2. Enregistrer.

Ouvrir le site : l'accueil doit afficher 204 personnages, 60 îles… et les photos.
Faire un essai : modifier une fiche, ajouter une photo, recharger la page.

## Ensuite
- **Supabase** : une fois que tout marche sur O2switch, on peut repasser Supabase en gratuit
  (Billing), puis supprimer le projet quand tu es sûr. Garde d'abord une sauvegarde complète : `node --env-file=.env.local backup.mjs` (ancien script, lit Supabase).
- **Vercel** : le site Vercel ne marchera plus (il n'a pas l'API PHP). On peut le supprimer ou le
  rediriger vers le domaine O2switch.
- **Sauvegardes** : O2switch sauvegarde tout chaque jour (cPanel → JetBackup). En plus, phpMyAdmin →
  Exporter permet de garder une copie de la base sur le PC.

## Mettre à jour le site plus tard
1. Sur le PC : `npm run export`.
2. Envoyer le contenu de `.next-export/` dans `public_html` en remplaçant les fichiers.
   `api/config.php` et les images de `media/` ne sont jamais écrasés (ils ne sont pas dans l'export).
3. Si une mise à jour ajoute une colonne : exécuter le fichier `serveur/migration-N.sql` fourni dans
   phpMyAdmin (onglet SQL), comme avant avec Supabase.

## Développer en local
`npm run dev` a besoin d'une API. Le plus simple : utiliser celle du site en ligne.
- Dans `.env.local` : `NEXT_PUBLIC_API_URL=https://TON-DOMAINE/api`
- Dans `public_html/api/config.php` sur O2switch : `'cors_origins' => ['http://localhost:3000']`
Les photos (adresses `/media/...`) ne s'affichent pas en local, le reste oui.
Attention : en local on modifie alors les **vraies** données.
