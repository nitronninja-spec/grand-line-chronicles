// Construit le site complet à envoyer sur O2switch dans .next-export/ :
// pages statiques + API PHP (serveur/api/) + protection du dossier media/.
// Usage : npm run export   →  envoyer le CONTENU de .next-export/ dans public_html.
// api/config.php (mot de passe MySQL) n'est jamais copié : il est créé une fois sur le serveur
// et un nouvel envoi ne l'écrase donc pas.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'

const r = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, EXPORT_STATIC: '1' } })
if (r.status !== 0) process.exit(r.status ?? 1)

cpSync('serveur/api', '.next-export/api', { recursive: true, filter: src => !/config\.php$/.test(src) })
mkdirSync('.next-export/media', { recursive: true })
cpSync('serveur/media/.htaccess', '.next-export/media/.htaccess')
cpSync('serveur/.htaccess', '.next-export/.htaccess')
cpSync('serveur/_next.htaccess', '.next-export/_next/.htaccess')

console.log('\nSite prêt : envoyer le CONTENU du dossier .next-export/ dans public_html (les images déjà en ligne dans media/ ne sont pas touchées).')
