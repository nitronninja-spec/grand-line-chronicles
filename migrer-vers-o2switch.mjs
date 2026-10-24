// Transfert unique Supabase → O2switch. Ne modifie RIEN sur Supabase (lecture seule).
// Usage : npm run migrer   (lit NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local)
// Produit o2switch-transfert/ :
//   donnees.sql  → à importer dans phpMyAdmin APRÈS serveur/schema.sql
//   media/       → les images réellement utilisées par les fiches (les ~320 orphelines sont laissées)
//   media.zip    → le même dossier compressé, à envoyer puis extraire dans public_html/media/
// Relançable : les images déjà téléchargées sont sautées.
import { mkdir, writeFile, stat, readFile, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_BASE || !KEY) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes dans .env.local.')
  process.exit(1)
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const PREFIXE_MEDIA = `${URL_BASE}/storage/v1/object/public/media/`
const SORTIE = 'o2switch-transfert'

// lames avant fruits (fruits.lame_id pointe vers lames.id).
const TABLES = [
  'personnages', 'lames', 'fruits', 'despas', 'pds', 'cristaux_primordiaux',
  'iles', 'factions', 'faction_relations', 'sessions', 'lore', 'categories',
]

// Colonnes de chaque table côté MySQL, lues dans serveur/schema.sql : une colonne présente sur
// Supabase mais absente du schéma ferait échouer l'import, on s'arrête donc avant.
async function colonnesSchema() {
  const sql = await readFile('serveur/schema.sql', 'utf8')
  const res = {}
  for (const [, table, corps] of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\) ENGINE/g)) {
    res[table] = {}
    for (const ligne of corps.split('\n')) {
      const m = ligne.match(/^\s+(\w+)\s+([A-Z]+)/)
      if (m && !['CONSTRAINT', 'UNIQUE', 'PRIMARY', 'KEY'].includes(m[1])) res[table][m[1]] = m[2]
    }
  }
  return res
}

async function lireTable(name) {
  const rows = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const res = await fetch(`${URL_BASE}/rest/v1/${name}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + page - 1}` },
    })
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`)
    const batch = await res.json()
    rows.push(...batch)
    if (batch.length < page) break
  }
  return rows
}

// Remplace chaque URL Supabase de l'image par /media/<chemin> (n'importe où dans la fiche :
// photo, photos[], pdfs[], texte...) et note le chemin à télécharger.
function reecrireUrls(valeur, chemins) {
  if (typeof valeur === 'string') {
    return valeur.split(PREFIXE_MEDIA).map((morceau, i) => {
      if (i === 0) return morceau
      const fin = morceau.search(/["'\s)<>]/)
      const brut = fin === -1 ? morceau : morceau.slice(0, fin)
      const chemin = brut.split('?')[0]
      chemins.add(chemin)
      return '/media/' + chemin + (fin === -1 ? '' : morceau.slice(fin))
    }).join('')
  }
  if (Array.isArray(valeur)) return valeur.map(v => reecrireUrls(v, chemins))
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, reecrireUrls(v, chemins)]))
  }
  return valeur
}

function texteSql(s) {
  return "'" + s.replace(/[\0\n\r\x1a'\\]/g, c => ({ '\0': '\\0', '\n': '\\n', '\r': '\\r', '\x1a': '\\Z', "'": "\\'", '\\': '\\\\' })[c]) + "'"
}

function valeurSql(v, type) {
  if (v === null || v === undefined) return 'NULL'
  if (type === 'JSON') return texteSql(JSON.stringify(v))
  if (type === 'TINYINT') return v ? '1' : '0'
  if (type === 'INT' || type === 'DOUBLE') return String(Number(v))
  if (type === 'DATETIME') {
    // "2026-08-18T05:00:31.492882+00:00" → "2026-08-18 05:00:31.492882" (UTC, microsecondes gardées)
    const utc = /[+-]00(:?00)?$|Z$/.test(v) ? v.replace(/([+-]00(:?00)?|Z)$/, '') : new Date(v).toISOString().replace('Z', '')
    return texteSql(utc.replace('T', ' '))
  }
  if (type === 'DATE') return texteSql(String(v).slice(0, 10))
  return texteSql(typeof v === 'string' ? v : JSON.stringify(v))
}

async function existe(p) {
  try { return (await stat(p)).size > 0 } catch { return false }
}

const schema = await colonnesSchema()
await mkdir(path.join(SORTIE, 'media'), { recursive: true })

const chemins = new Set()
const lignesSql = [
  '-- Données Grand Line Chronicles exportées de Supabase le ' + new Date().toISOString(),
  '-- À importer dans phpMyAdmin APRÈS serveur/schema.sql.',
  'SET NAMES utf8mb4;',
  "SET time_zone = '+00:00';",
  'SET FOREIGN_KEY_CHECKS = 0;',
  '',
]
const resume = { tables: {}, images: 0, octets: 0, introuvables: [] }

for (const table of TABLES) {
  const cols = schema[table]
  if (!cols) throw new Error(`Table ${table} absente de serveur/schema.sql`)
  const rows = (await lireTable(table)).map(r => reecrireUrls(r, chemins))
  resume.tables[table] = rows.length
  console.log(`${table} : ${rows.length} ligne(s)`)
  const inconnues = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(c => !cols[c])
  if (inconnues.length) throw new Error(`${table} : colonne(s) ${inconnues.join(', ')} absente(s) de serveur/schema.sql — les ajouter avant de relancer.`)
  lignesSql.push(`DELETE FROM \`${table}\`;`)
  for (const r of rows) {
    const noms = Object.keys(r)
    lignesSql.push(`INSERT INTO \`${table}\` (${noms.map(c => '`' + c + '`').join(', ')}) VALUES (${noms.map(c => valeurSql(r[c], cols[c])).join(', ')});`)
  }
  lignesSql.push('')
}
lignesSql.push('SET FOREIGN_KEY_CHECKS = 1;', '')
await writeFile(path.join(SORTIE, 'donnees.sql'), lignesSql.join('\n'))

console.log(`\n${chemins.size} image(s)/fichier(s) utilisés par les fiches, téléchargement...`)
let n = 0
for (const chemin of chemins) {
  n++
  const local = path.join(SORTIE, 'media', ...decodeURIComponent(chemin).split('/'))
  if (await existe(local)) { resume.images++; resume.octets += (await stat(local)).size; continue }
  const res = await fetch(PREFIXE_MEDIA + chemin)
  if (!res.ok) { resume.introuvables.push(chemin); console.warn(`  introuvable (${res.status}) : ${chemin}`); continue }
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(path.dirname(local), { recursive: true })
  await writeFile(local, buf)
  resume.images++
  resume.octets += buf.length
  if (n % 25 === 0) console.log(`  ${n}/${chemins.size}`)
}
await writeFile(path.join(SORTIE, 'resume.json'), JSON.stringify(resume, null, 2))

// Archive zip (le gestionnaire de fichiers cPanel sait l'extraire) — le tar.exe de Windows 10+ sait
// écrire du zip ; on l'appelle par son chemin, car le tar de Git Bash écrirait un .tar nommé .zip.
await rm(path.join(SORTIE, 'media.zip'), { force: true })
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar'
const zip = spawnSync(tar, ['-a', '-cf', '../media.zip', '.'], { cwd: path.join(SORTIE, 'media'), stdio: 'inherit' })

console.log(`\nTerminé : ${resume.images} fichier(s), ${(resume.octets / 1048576).toFixed(1)} Mo.`)
if (resume.introuvables.length) console.log(`${resume.introuvables.length} fichier(s) référencé(s) mais introuvable(s) sur Supabase (liste dans resume.json).`)
console.log(`→ ${SORTIE}/donnees.sql à importer dans phpMyAdmin (après serveur/schema.sql)`)
console.log(zip.status === 0 ? `→ ${SORTIE}/media.zip à envoyer et extraire dans public_html/media/` : `→ ${SORTIE}/media/ à envoyer dans public_html/media/ (zip impossible ici)`)
