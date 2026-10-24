// Sauvegarde locale : toutes les tables (JSON) + toutes les images du bucket "media".
// Usage :  node --env-file=.env.local backup.mjs
// Reprise : node --env-file=.env.local backup.mjs backup/<dossier>  (saute les images déjà téléchargées)
// Résultat : backup/AAAA-MM-JJ_HH-MM/{tables/*.json, media/**, resume.json}
import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_BASE || !KEY) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes (lance avec --env-file=.env.local).')
  process.exit(1)
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const TABLES = [
  'personnages', 'fruits', 'despas', 'pds', 'lames', 'cristaux_primordiaux',
  'iles', 'factions', 'sessions', 'lore', 'categories',
]

const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
const root = process.argv[2] || path.join('backup', stamp)
const errors = []

async function dumpTable(name) {
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
  await writeFile(path.join(root, 'tables', `${name}.json`), JSON.stringify(rows, null, 2))
  return rows.length
}

// Liste récursive du bucket (les "dossiers" n'ont pas d'id, les fichiers en ont un).
async function listBucket(prefix = '') {
  const files = []
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/media`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`liste "${prefix}": HTTP ${res.status} ${await res.text()}`)
    const items = await res.json()
    for (const it of items) {
      const full = prefix ? `${prefix}/${it.name}` : it.name
      if (it.id) files.push({ path: full, size: it.metadata?.size ?? 0 })
      else files.push(...(await listBucket(full)))
    }
    if (items.length < 100) break
  }
  return files
}

async function downloadFile(file) {
  const dest = path.join(root, 'media', ...file.path.split('/'))
  try {
    const st = await stat(dest)
    if (st.size > 0 && (!file.size || st.size === file.size)) return st.size
  } catch {}
  const url = `${URL_BASE}/storage/v1/object/public/media/${file.path.split('/').map(encodeURIComponent).join('/')}`
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(path.dirname(dest), { recursive: true })
      await writeFile(dest, buf)
      return buf.length
    }
    // 429 / 5xx : on attend un peu et on réessaie
    if (attempt >= 6 || (res.status < 500 && res.status !== 429)) throw new Error(`${file.path}: HTTP ${res.status}`)
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
  }
}

await mkdir(path.join(root, 'tables'), { recursive: true })

const counts = {}
for (const t of TABLES) {
  try {
    counts[t] = await dumpTable(t)
    console.log(`✔ ${t}: ${counts[t]} lignes`)
  } catch (e) {
    errors.push(String(e.message))
    console.error(`✘ ${e.message}`)
  }
}

const files = await listBucket()
console.log(`Images à télécharger : ${files.length}`)
let bytes = 0, done = 0
const queue = [...files]
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const f = queue.shift()
    try { bytes += await downloadFile(f); done++ } catch (e) { errors.push(String(e.message)) }
    if (done % 50 === 0 && done) console.log(`  ${done}/${files.length}`)
  }
}))

const resume = { date: new Date().toISOString(), tables: counts, images: { attendues: files.length, telechargees: done, octets: bytes }, erreurs: errors }
await writeFile(path.join(root, 'resume.json'), JSON.stringify(resume, null, 2))
console.log(`\nImages : ${done}/${files.length} (${(bytes / 1048576).toFixed(1)} Mo) — erreurs : ${errors.length}`)
console.log(`Sauvegarde dans : ${path.resolve(root)}`)
if (errors.length) process.exitCode = 1
