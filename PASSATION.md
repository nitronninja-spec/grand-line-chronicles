# Grand Line Chronicles — dossier de passation

Document écrit pour qu'une nouvelle personne (ou un nouvel assistant Claude Code) reprenne le site
sans l'historique de conversation. Aucun secret ici : les clés Supabase se transmettent à part.

## Lancer le site en local
1. Installer [Node.js](https://nodejs.org) (version LTS) et Git.
2. `git clone https://github.com/nitronninja-spec/grand-line-chronicles.git` puis `cd grand-line-chronicles`
3. `npm install`
4. Créer un fichier `.env.local` à la racine (jamais commité) avec :
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   (valeurs à demander à Matéis, ou celles de TON projet Supabase — voir « Base de données »).
5. `npm run dev` puis ouvrir http://localhost:3000

## Déploiement
Vercel déploie automatiquement à chaque `git push origin main`. **Un commit non poussé n'apparaît pas
sur le site en ligne.** Les variables d'environnement ci-dessus sont aussi réglées côté Vercel.

## Base de données (Supabase)
- Tables : `personnages`, `fruits`, `despas`, `pds`, `lames`, `cristaux_primordiaux`, `iles`,
  `factions`, `sessions` (= journaux), `lore`, `categories`. Images dans le bucket public `media`.
- Le code n'a que la clé « anon » : **aucun accès admin**. Tout changement de structure passe par un
  fichier `supabase-migration-N.sql` (dernier : 23) que l'on exécute à la main dans le SQL Editor de Supabase.
- `setup-complet.sql` recrée toute la structure sur un Supabase vierge (en une exécution).
- Deux options pour un nouveau poste :
  - **Même base** : on partage l'URL + la clé anon → mêmes données, modifications visibles partout.
  - **Base séparée** : créer un projet Supabase, exécuter `setup-complet.sql`, puis réinjecter la
    sauvegarde (le script de restauration n'existe pas encore).

## Sauvegarde locale
`node --env-file=.env.local backup.mjs` télécharge toutes les tables (JSON) et toutes les images dans
`backup/AAAA-MM-JJ_HH-MM/` (dossier ignoré par Git). Relançable avec le dossier en argument pour reprendre
après une erreur. Penser à copier ce dossier hors du PC (disque externe / cloud).

## Architecture et conventions (à respecter)
- **Next.js non standard** : lire `AGENTS.md` et `node_modules/next/dist/docs/` avant d'écrire du code.
- Toutes les pages sont en `'use client'` ; pas de CSS externe : styles inline via `const S = {...}`
  par page, thème or / police Cinzel. Les animations passent par un `<style>{`...`}</style>` dans la page.
- **Toute écriture Supabase doit vérifier `.error` et faire un `alert()` en cas d'échec.**
- Les catégories/statuts (types de personnage, classes DS/PDS…) viennent de la table `categories`
  (composant `CategoryManager`, section Personnalisation du dashboard), avec repli sur des listes en dur.
- Métadonnées de relation en tableaux JSONB sur la fiche (`personnages.rangs`, `personnages.iles_liees`,
  `factions.rangs`) plutôt que des tables de jointure. Liens réciproques calculés à l'affichage
  (ex. Fruit↔Lame, Personnage↔Île) : on n'écrit la donnée que d'un seul côté.
- Tri manuel par glisser-déposer : colonne `ordre_manuel` (modèles : `reorderFactions` / `reorderMembers`
  dans `src/app/factions/page.tsx`).
- **Images** : toujours passer par `uploadImage()` (`src/lib/supabase.ts`) → compression auto (1600 px max,
  JPEG) ; toutes les `<img>` ont `loading="lazy"`. Raison : une crise de « Cached Egress » Supabase
  (68 Go en 2 jours) venait d'images de 20 Mo+ servies sans compression ni lazy-loading.
- Remplacer une photo laisse l'ancien fichier dans le bucket (≈ 320 fichiers / 1,5 Go orphelins à ce jour).

## Fonctionnalités récentes
- Personnages : îles liées (+ notes par île), Haki (Observation / Armement / Conquérant), tri « Par Haki »,
  cadre rouge pulsant + éclairs animés pour le Haki du Roi (carte et vue détail).
- Îles : fiche détaillée au clic, liste des personnages liés (île natale ou île liée).
- Factions : onglet Révolutionnaire. Fruits : lien vers une Lame (passe le fruit en « Mangé »).
- DS / PDS regroupés par palier. Carte « Techniques » retirée de l'accueil (page inexistante).

## Pièges déjà rencontrés
- Dans un navigateur de test « caché », `document.body.innerText` renvoie du vide : utiliser `textContent`.
- Un compte Supabase gratuit est limité à 5 Go d'egress / 1 Go de stockage ; le projet est passé en Pro
  pendant la crise (cycle de facturation du 11 au 11 du mois).
- Idée écartée : comptes utilisateurs pour des notes privées (seul un champ « notes » existe).

## Hébergement sans Node (ex. O2switch) : export statique
`npm run export` construit un site 100 % statique dans `.next-export/` (testé : toutes les pages chargent
et lisent Supabase). Envoyer le **contenu** de ce dossier dans `public_html` (FTP ou Gestionnaire de fichiers
cPanel). Les clés `NEXT_PUBLIC_*` sont incrustées au build depuis `.env.local`. Le build Vercel normal
(`npm run build`) n'est pas affecté. Pas de déploiement automatique : refaire l'export à chaque mise à jour.
