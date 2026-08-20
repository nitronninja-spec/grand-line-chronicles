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

export interface CategoryFull { value: string; emoji: string; color: string; cap: number | null }

// Variante brute (emoji, couleur et plafond séparés, non combinés dans un libellé) pour les
// pages qui construisent leurs propres dictionnaires Record<valeur, couleur|emoji|plafond>
// (ex: Journaux, Lames).
export async function fetchCategoryFull(contentType: string, dimension: string, fallback: CategoryFull[]): Promise<CategoryFull[]> {
  const { data, error } = await supabase.from('categories').select('value,emoji,color,cap')
    .eq('content_type', contentType).eq('dimension', dimension).eq('actif', true)
    .order('ordre', { ascending: true })
  if (error || !data || data.length === 0) return fallback
  return data.map(d => ({ value: d.value as string, emoji: (d.emoji as string) || '', color: (d.color as string) || '#7a9ab8', cap: (d.cap as number) ?? null }))
}

export interface CategoryRow { id: string; label: string; color: string }

// Variante pour les pages qui affichent aussi la couleur par catégorie (ex: Lore) — même
// contrat de repli que fetchCategoryValues. Le libellé inclut l'emoji en préfixe (ex: "📜
// Histoire") pour reproduire à l'identique l'ancien format codé en dur.
export async function fetchCategoryRows(contentType: string, dimension: string, fallback: CategoryRow[]): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from('categories').select('value,label,emoji,color')
    .eq('content_type', contentType).eq('dimension', dimension).eq('actif', true)
    .order('ordre', { ascending: true })
  if (error || !data || data.length === 0) return fallback
  return data.map(d => {
    const label = (d.label as string) || (d.value as string)
    return { id: d.value as string, label: d.emoji ? `${d.emoji} ${label}` : label, color: (d.color as string) || '#7a9ab8' }
  })
}
