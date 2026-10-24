// Construit le site statique (dossier .next-export/) à envoyer sur l'hébergeur (ex. O2switch).
// Usage : npm run export
import { spawnSync } from 'node:child_process'
const r = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, EXPORT_STATIC: '1' } })
if (r.status === 0) console.log('\nSite statique prêt : envoyer le CONTENU du dossier .next-export/ dans public_html.')
process.exit(r.status ?? 1)
