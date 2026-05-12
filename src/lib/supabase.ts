import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function uploadImage(file: File, folder: string = 'general'): Promise<string | null> {
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
