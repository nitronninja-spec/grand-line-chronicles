/* eslint-disable @typescript-eslint/no-explicit-any */
// Accès aux données du site, hébergées sur O2switch (MySQL + API PHP dans serveur/api/).
// `db` imite l'interface de supabase-js qu'utilisaient les pages (from/select/insert/update/
// delete/eq/order/limit/single...), pour que la migration hors de Supabase ne touche presque pas
// leur code. Chaque requête part en un POST JSON vers api/db.php, qui renvoie { data, count, error }.

// '/api' quand le site et l'API sont sur le même domaine (O2switch) ; une URL complète en
// développement local (ex. NEXT_PUBLIC_API_URL=https://mon-site.fr/api dans .env.local).
const API = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'contains'
// Les lignes sont typées any[] comme avec un client supabase-js sans types générés ; single() → any.
type Resultat<D = any[]> = { data: D | null; count: number | null; error: { message: string; code?: string } | null }

class Requete<D = any[]> implements PromiseLike<Resultat<D>> {
  private corps: Record<string, any>

  constructor(table: string) {
    this.corps = { table, action: 'select', columns: '*', filters: [], order: [] }
  }

  select(columns = '*', opts: { count?: 'exact'; head?: boolean } = {}) {
    // Après insert/update/delete, .select() demande de renvoyer les lignes écrites.
    if (this.corps.action === 'select') {
      if (opts.count) this.corps.count = true
      if (opts.head) this.corps.head = true
    } else {
      this.corps.returning = true
    }
    this.corps.columns = columns
    return this
  }

  insert(values: Record<string, any> | Record<string, any>[]) { this.corps.action = 'insert'; this.corps.values = values; return this }
  update(values: Record<string, any>) { this.corps.action = 'update'; this.corps.values = values; return this }
  delete() { this.corps.action = 'delete'; return this }

  private filtre(col: string, op: string, val: unknown) { this.corps.filters.push([col, op, val]); return this }
  eq(col: string, val: unknown) { return this.filtre(col, 'eq', val) }
  neq(col: string, val: unknown) { return this.filtre(col, 'neq', val) }
  gt(col: string, val: unknown) { return this.filtre(col, 'gt', val) }
  gte(col: string, val: unknown) { return this.filtre(col, 'gte', val) }
  lt(col: string, val: unknown) { return this.filtre(col, 'lt', val) }
  lte(col: string, val: unknown) { return this.filtre(col, 'lte', val) }
  like(col: string, val: string) { return this.filtre(col, 'like', val) }
  ilike(col: string, val: string) { return this.filtre(col, 'ilike', val) }
  is(col: string, val: null | boolean) { return this.filtre(col, 'is', val) }
  in(col: string, vals: unknown[]) { return this.filtre(col, 'in', vals) }
  contains(col: string, vals: unknown[]) { return this.filtre(col, 'contains', vals) }
  not(col: string, op: Op, val: unknown) { return this.filtre(col, 'not.' + op, val) }
  match(obj: Record<string, unknown>) { for (const [c, v] of Object.entries(obj)) this.eq(c, v); return this }

  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.corps.order.push([col, opts.ascending !== false, opts.nullsFirst ?? null])
    return this
  }
  limit(n: number) { this.corps.limit = n; return this }
  range(from: number, to: number) { this.corps.offset = from; this.corps.limit = to - from + 1; return this }
  single(): Requete<any> { this.corps.single = 'single'; return this }
  maybeSingle(): Requete<any> { this.corps.single = 'maybe'; return this }

  private async executer(): Promise<Resultat<D>> {
    try {
      const res = await fetch(`${API}/db.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.corps),
      })
      const json = await res.json().catch(() => null)
      if (!json) return { data: null, count: null, error: { message: `Réponse invalide du serveur (HTTP ${res.status})` } }
      return { data: json.data ?? null, count: json.count ?? null, error: json.error ?? null }
    } catch (e) {
      return { data: null, count: null, error: { message: e instanceof Error ? e.message : 'Serveur injoignable' } }
    }
  }

  then<A = Resultat<D>, B = never>(ok?: ((r: Resultat<D>) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    return this.executer().then(ok, ko)
  }
}

export const db = {
  from: (table: string) => new Requete(table),
}

// Recadre à une dimension raisonnable et réencode en JPEG avant upload — la plupart des
// photos viennent de téléphones (plusieurs Mo, souvent >3000px) alors qu'elles ne s'affichent
// jamais au-delà de quelques centaines de pixels sur le site. Les GIF sont épargnés pour ne
// pas casser l'animation (le canvas ne capture que la première frame). En cas d'échec
// (navigateur trop ancien, image corrompue, PDF...), on retombe sur le fichier original plutôt que
// de bloquer l'enregistrement.
export async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  if (file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    const newName = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Upload brut, sans compression — utilisé en interne par uploadImage() (après compression).
// Le fichier part dans media/<folder>/ sur O2switch (serveur/api/upload.php).
export async function uploadRawFile(file: File, folder: string = 'general'): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  try {
    const res = await fetch(`${API}/upload.php`, { method: 'POST', body: form })
    const json = await res.json().catch(() => null)
    if (!json?.url) { console.error(json?.error?.message ?? `Upload : HTTP ${res.status}`); return null }
    return json.url
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function uploadImage(file: File, folder: string = 'general'): Promise<string | null> {
  const compressed = await compressImage(file)
  return uploadRawFile(compressed, folder)
}
