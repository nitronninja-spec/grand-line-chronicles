import { supabase } from './supabase'

// Récupère la liste ordonnée des valeurs actives d'une dimension (ex: content_type='despa',
// dimension='classe') depuis la table "categories" configurable via Dashboard → Personnalisation.
// Repli sur le tableau fourni si la table est vide, en erreur, ou pas encore migrée —
// aucune page ne doit jamais se retrouver sans options par manque de données.
export async function fetchCategoryValues(contentType: string, dimension: string, fallback: string[]): Promise<string[]> {
  const { data, error } = await supabase.from('categories').select('value')
    .eq('content_type', contentType).eq('dimension', dimension).eq('actif', true)
    .order('ordre', { ascending: true })
  if (error || !data || data.length === 0) return fallback
  return data.map(d => d.value as string)
}
