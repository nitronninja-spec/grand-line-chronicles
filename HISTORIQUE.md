# Historique du projet (résumé de la conversation avec Claude)

Résumé lisible de ce qui a été fait et décidé, pour qu'un nouvel assistant reprenne le contexte.
Détails techniques et conventions : voir `PASSATION.md`. Aucun secret dans ce fichier.

## À propos de la personne
- Matéis, MJ d'un JDR One Piece ; le site est son outil de campagne (fiches, îles, factions, lore…).
- Écrit en français, de façon rapide et familière (fautes de frappe fréquentes) : répondre en français,
  simplement, avec des étapes concrètes (« va ici, clique là »), sans jargon inutile.
- Veut des problèmes **corrigés et vérifiés en vrai**, pas seulement décrits. Les actions externes
  (git push, suppression, DDL Supabase) ont toujours été confirmées avant exécution.

## Chronologie
1. **Taxonomies configurables (phases 1-7)** — table `categories`, section Personnalisation du dashboard,
   tri manuel par glisser-déposer partout, DS/PDS groupés par palier, lien Fruit↔Lame, onglet
   Révolutionnaire, carte « Techniques » retirée.
2. **Crise Supabase « Cached Egress »** (68 Go en 2 jours, plan gratuit à 5 Go) — cause : images jamais
   compressées (jusqu'à 21 Mo) et sans lazy-loading. Corrigé : `loading="lazy"` sur toutes les `<img>`,
   compression à l'upload (`compressImage`, 1600 px / JPEG), recompression des anciennes images
   (1,46 Go → 64 Mo). Le projet est passé en Pro (100 Go) pendant la crise.
3. **`setup-complet.sql`** — recrée toute la base (22 migrations + tables de base reconstruites) sur un
   Supabase vierge ; durci avec des `add column if not exists` avant les backfills après une erreur
   « colonne equipage » signalée par l'utilisateur.
4. **Nouvelles fonctionnalités** — îles liées à un personnage avec notes, Haki (3 cases), fiche détaillée
   des îles avec personnages liés, tri par Haki, cadre rouge pulsant + éclairs pour le Haki du Roi.
   Migration 23 exécutée par l'utilisateur.
5. **Déploiement** — 21 commits n'avaient jamais été poussés (rien n'apparaissait en ligne) ; poussés sur
   `origin/main`, Vercel a redéployé. Rappel : sans `git push`, le site en ligne ne change pas.
6. **Sauvegarde locale** — `backup.mjs` (tables JSON + 711 images, ~1,5 Go dont ~1,47 Go non référencées).
7. **Changement d'hébergeur envisagé (O2switch)** — `npm run export` produit un site statique testé en
   local (`.next-export/`) ; données et images restent sur Supabase.

## Décisions et idées écartées
- Notes privées par compte utilisateur : écarté, un simple champ « notes » suffit.
- Partage du compte Claude avec un ami : déconseillé ; chacun utilise son compte et ce dossier de passation.
- Pas de suppression des ~320 images orphelines du bucket sans validation explicite.

## Reste à faire / pistes
- Script de restauration (`restore.mjs`) pour réinjecter une sauvegarde dans un autre Supabase.
- Nettoyage éventuel des images orphelines (liste à montrer avant toute suppression).
- Mise en ligne sur O2switch (envoyer le contenu de `.next-export/` dans `public_html`).
