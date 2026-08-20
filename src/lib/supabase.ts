import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Recadre à une dimension raisonnable et réencode en JPEG avant upload — la plupart des
// photos viennent de téléphones (plusieurs Mo, souvent >3000px) alors qu'elles ne s'affichent
// jamais au-delà de quelques centaines de pixels sur le site. Les GIF sont épargnés pour ne
// pas casser l'animation (le canvas ne capture que la première frame). En cas d'échec
// (navigateur trop ancien, image corrompue...), on retombe sur le fichier original plutôt que
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

// Upload brut, sans compression — utilisé en interne par uploadImage() (après compression) et
// par le script de recompression rétroactive (src/app/admin-recompress), qui compresse déjà
// lui-même en amont et ne doit pas repasser une deuxième fois par compressImage().
export async function uploadRawFile(file: File, folder: string = 'general'): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(fileName, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) { console.error(error); return null }
  const { data } = supabase.storage.from('media').getPublicUrl(fileName)
  return data.publicUrl
}

export async function uploadImage(file: File, folder: string = 'general'): Promise<string | null> {
  const compressed = await compressImage(file)
  return uploadRawFile(compressed, folder)
}
