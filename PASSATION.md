# Grand Line Chronicles — dossier de passation

Document écrit pour qu'une nouvelle personne (ou un nouvel assistant Claude Code) reprenne le site
sans l'historique de conversation. Aucun secret ici : les identifiants MySQL / cPanel se transmettent à part.

## Lancer le site en local
1. Installer [Node.js](https://nodejs.org) (version LTS) et Git.
2. `git clone https://github.com/nitronninja-spec/grand-line-chronicles.git` puis `cd grand-line-chronicles`
3. `npm install`
4. Créer un fichier `.env.local` à la racine (jamais commité) avec
   `NEXT_PUBLIC_API_URL=https://DOMAINE-DU-SITE/api` (et autoriser `http://localhost:3000` dans
   `cors_origins` de `api/config.php` sur O2switch) — voir `MISE-EN-LIGNE-O2SWITCH.md`.
5. `npm run dev` puis ouvrir http://localhost:3000 (attention : on travaille alors sur les vraies données).

## Hébergement : tout sur O2switch (plus de Supabase ni de Vercel)
Guide pas à pas : **`MISE-EN-LIGNE-O2SWITCH.md`**. Pas de déploiement automatique : `npm run export`
puis envoi du contenu de `.next-export/` dans `public_html` (cPanel). Un `git push` ne met plus le site à jour.

## Base de données (MySQL / MariaDB sur O2switch)
- Tables : `personnages`, `fruits`, `despas`, `pds`, `lames`, `cristaux_primordiaux`, `iles`,
  `factions`, `faction_relations`, `sessions` (= journaux), `lore`, `categories`.
- Structure : `serveur/schema.sql`. Tableaux et JSONB d'avant → colonnes `JSON` ; uuid → `CHAR(36)`
  (généré par l'API) ; dates en UTC. Tout changement de structure : un fichier `serveur/migration-N.sql`
  exécuté à la main dans phpMyAdmin (les `supabase-migration-*.sql` et `setup-complet.sql` sont l'historique Supabase).
- Le navigateur ne parle jamais directement à MySQL : `src/lib/db.ts` envoie chaque requête en JSON à
  `serveur/api/db.php`, qui valide tables/colonnes contre la vraie base et utilise des requêtes préparées.
  `db` imite supabase-js (`db.from('x').select(...).eq(...).order(...)`, `insert`, `update`, `delete`,
  `contains`, `ilike`, `not`, `single`, `count`) : les pages s'écrivent comme avant.
  Une nouvelle colonne est reconnue automatiquement ; une nouvelle table doit être ajoutée à
  `TABLES_AUTORISEES` dans `serveur/api/_commun.php`.
- Identifiants MySQL dans `api/config.php` sur le serveur uniquement (modèle : `config.exemple.php`).
- Comme avant avec la clé anon Supabase, l'API est ouverte : quiconque connaît l'adresse peut lire et écrire.
- `migrer-vers-o2switch.mjs` (`npm run migrer`) : transfert unique depuis Supabase (lecture seule) →
  `o2switch-transfert/` (`donnees.sql` + images utilisées, URL réécrites en `/media/...`).

## Sauvegarde locale
Sur O2switch : JetBackup (cPanel) sauvegarde tout chaque jour ; phpMyAdmin → Exporter pour une copie de la base.
Ancien script, **lit Supabase** (utile avant de supprimer le projet) : `node --env-file=.env.local backup.mjs` télécharge toutes les tables (JSON) et toutes les images dans
`backup/AAAA-MM-JJ_HH-MM/` (dossier ignoré par Git). Relançable avec le dossier en argument pour reprendre
après une erreur. Penser à copier ce dossier hors du PC (disque externe / cloud).

## Architecture et conventions (à respecter)
- **Next.js non standard** : lire `AGENTS.md` et `node_modules/next/dist/docs/` avant d'écrire du code.
- Toutes les pages sont en `'use client'` ; pas de CSS externe : styles inline via `const S = {...}`
  par page, thème or / police Cinzel. Les animations passent par un `<style>{`...`}</style>` dans la page.
- **Toute écriture en base doit vérifier `.error` et faire un `alert()` en cas d'échec.**
- Les catégories/statuts (types de personnage, classes DS/PDS…) viennent de la table `categories`
  (composant `CategoryManager`, section Personnalisation du dashboard), avec repli sur des listes en dur.
- Métadonnées de relation en tableaux JSONB sur la fiche (`personnages.rangs`, `personnages.iles_liees`,
  `factions.rangs`) plutôt que des tables de jointure. Liens réciproques calculés à l'affichage
  (ex. Fruit↔Lame, Personnage↔Île) : on n'écrit la donnée que d'un seul côté.
- Tri manuel par glisser-déposer : colonne `ordre_manuel` (modèles : `reorderFactions` / `reorderMembers`
  dans `src/app/factions/page.tsx`).
- **Images** : toujours passer par `uploadImage()` (`src/lib/db.ts`) → compression auto (1600 px max,
  JPEG) puis `serveur/api/upload.php` → `public_html/media/<dossier>/` ; toutes les `<img>` ont
  `loading="lazy"`. Raison : une crise de « Cached Egress » Supabase (68 Go en 2 jours) venait d'images
  de 20 Mo+ servies sans compression ni lazy-loading. `media/.htaccess` interdit d'y exécuter du code.
- Remplacer une photo laisse l'ancien fichier dans `media/` (les orphelins de Supabase n'ont pas été transférés).

## Fonctionnalités récentes
- Personnages : îles liées (+ notes par île), Haki (Observation / Armement / Conquérant), tri « Par Haki »,
  cadre rouge pulsant + éclairs animés pour le Haki du Roi (carte et vue détail).
- Îles : fiche détaillée au clic, liste des personnages liés (île natale ou île liée).
- Factions : onglet Révolutionnaire. Fruits : lien vers une Lame (passe le fruit en « Mangé »).
- DS / PDS regroupés par palier. Carte « Techniques » retirée de l'accueil (page inexistante).

## Pièges déjà rencontrés
- Dans un navigateur de test « caché », `document.body.innerText` renvoie du vide : utiliser `textContent`.
- Supabase (ancien hébergement des données) : passé en Pro pendant la crise ; à repasser en gratuit puis
  supprimer une fois O2switch validé.
- Le formulaire Lore peut créer l'article en double (sauvegarde auto + bouton « Sauvegarder » avant que
  l'id du premier soit connu) : bug d'origine, pas lié à O2switch.
- Idée écartée : comptes utilisateurs pour des notes privées (seul un champ « notes » existe).

## Export
`npm run export` construit dans `.next-export/` le site statique + `api/` (sans `config.php`) + `media/.htaccess`.
Envoyer le **contenu** dans `public_html` : `api/config.php` et les images déjà en ligne ne sont pas écrasés.
