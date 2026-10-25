// Crée les miniatures WebP (600 px de large) d'un dossier d'images : <dossier>/_mini/<chemin>.webp,
// comme upload.php le fait pour chaque nouvel envoi. Sert pour les images envoyées avant.
// Usage : node miniatures.mjs o2switch-transfert/media   puis envoyer <dossier>/_mini dans public_html/media/
// Relançable : les miniatures existantes sont sautées.
import { readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const racine = process.argv[2]
if (!racine) { console.error('Usage : node miniatures.mjs <dossier media>'); process.exit(1) }

function* images(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory() && e.name !== '_mini') yield* images(p)
    else if (/\.(jpe?g|png|gif|webp|avif)$/i.test(e.name)) yield p
  }
}

let crees = 0, avant = 0, apres = 0
for (const src of images(racine)) {
  const rel = path.relative(racine, src).replace(/\.[^.]+$/, '.webp')
  const cible = path.join(racine, '_mini', rel)
  if (existsSync(cible)) continue
  mkdirSync(path.dirname(cible), { recursive: true })
  await sharp(src, { animated: false }).rotate().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 75 }).toFile(cible)
  crees++
  avant += statSync(src).size
  apres += statSync(cible).size
}
console.log(`${crees} miniature(s) créée(s) : ${(avant / 1048576).toFixed(1)} Mo d'originaux → ${(apres / 1048576).toFixed(1)} Mo de miniatures.`)
