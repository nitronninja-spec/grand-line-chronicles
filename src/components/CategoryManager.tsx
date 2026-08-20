'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Category {
  id: string
  content_type: string
  dimension: string
  value: string
  label?: string
  emoji?: string
  color?: string
  cap?: number | null
  ordre: number
  actif: boolean
}

interface Group {
  contentType: string
  dimension: string
  section: string
  dimensionLabel: string
  table: string
  field: string
  hasCap?: boolean
}

// Les 17 couples (content_type, dimension) actuellement gérés par le site — chaque couple
// correspond à un enum autrefois codé en dur dans la page listée, et à la colonne texte de
// la table où la valeur est réellement stockée sur chaque fiche (nécessaire pour la cascade
// de renommage et la réaffectation à la suppression).
const GROUPS: Group[] = [
  { contentType: 'personnages', dimension: 'type', section: 'Personnages', dimensionLabel: 'Types de membre', table: 'personnages', field: 'type' },
  { contentType: 'personnages', dimension: 'statut', section: 'Personnages', dimensionLabel: 'Statuts', table: 'personnages', field: 'statut' },
  { contentType: 'personnages', dimension: 'titre_mondial', section: 'Personnages', dimensionLabel: 'Titres mondiaux', table: 'personnages', field: 'titre_mondial' },
  { contentType: 'factions', dimension: 'type', section: 'Factions', dimensionLabel: 'Types de faction', table: 'factions', field: 'type' },
  { contentType: 'fruits', dimension: 'type', section: 'Fruits', dimensionLabel: 'Types', table: 'fruits', field: 'type' },
  { contentType: 'fruits', dimension: 'statut', section: 'Fruits', dimensionLabel: 'Statuts', table: 'fruits', field: 'statut' },
  { contentType: 'lames', dimension: 'rang', section: 'Lames', dimensionLabel: 'Rangs', table: 'lames', field: 'rang', hasCap: true },
  { contentType: 'despa', dimension: 'type', section: 'DS', dimensionLabel: 'Types', table: 'despas', field: 'type' },
  { contentType: 'despa', dimension: 'classe', section: 'DS', dimensionLabel: 'Classes', table: 'despas', field: 'classe' },
  { contentType: 'despa', dimension: 'statut', section: 'DS', dimensionLabel: 'Statuts', table: 'despas', field: 'statut' },
  { contentType: 'despa', dimension: 'modificateur', section: 'DS', dimensionLabel: 'Modificateurs', table: 'despas', field: 'modificateur' },
  { contentType: 'pds', dimension: 'type', section: 'PDS', dimensionLabel: 'Types', table: 'pds', field: 'type' },
  { contentType: 'pds', dimension: 'classe', section: 'PDS', dimensionLabel: 'Classes', table: 'pds', field: 'classe' },
  { contentType: 'pds', dimension: 'statut', section: 'PDS', dimensionLabel: 'Statuts', table: 'pds', field: 'statut' },
  { contentType: 'iles', dimension: 'region', section: 'Îles', dimensionLabel: 'Régions', table: 'iles', field: 'region' },
  { contentType: 'journaux', dimension: 'categorie', section: 'Journaux', dimensionLabel: 'Catégories', table: 'sessions', field: 'categorie' },
  { contentType: 'lore', dimension: 'categorie', section: 'Lore', dimensionLabel: 'Catégories', table: 'lore', field: 'categorie' },
  { contentType: 'cristaux', dimension: 'categorie', section: 'Cristaux', dimensionLabel: 'Catégories', table: 'cristaux_primordiaux', field: 'categorie' },
]

const S = {
  wrap: { background: '#0a1829', border: '1px solid rgba(212,160,23,.18)', borderRadius: 16, overflow: 'hidden' } as React.CSSProperties,
  body: { display: 'flex', minHeight: 420 } as React.CSSProperties,
  sidebar: { width: 230, flexShrink: 0, borderRight: '1px solid rgba(30,120,200,.12)', padding: '.75rem', maxHeight: 560, overflowY: 'auto' as const },
  sectionTitle: { fontFamily: "'Cinzel',serif", fontSize: '.55rem', letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#4a6880', padding: '.6rem .5rem .3rem' },
  groupBtn: (active: boolean) => ({
    display: 'block', width: '100%', textAlign: 'left' as const, background: active ? 'rgba(212,160,23,.14)' : 'transparent',
    border: 'none', borderRadius: 8, padding: '.45rem .6rem', color: active ? '#f0c040' : '#8a9ab0', cursor: 'pointer',
    fontFamily: "'Cinzel',serif", fontSize: '.66rem', letterSpacing: '.03em', marginBottom: 2,
  }),
  content: { flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto' as const, maxHeight: 560 },
  row: (dragging: boolean) => ({
    display: 'flex', alignItems: 'center', gap: '.6rem', background: '#0d2040', border: `1px solid ${dragging ? '#d4a017' : 'rgba(30,120,200,.15)'}`,
    borderRadius: 10, padding: '.55rem .7rem', marginBottom: '.5rem', opacity: dragging ? .4 : 1, cursor: 'grab',
  }),
  input: { background: '#050d1a', border: '1px solid rgba(30,120,200,.25)', borderRadius: 6, padding: '.35rem .55rem', color: '#e8eef5', fontFamily: "'Crimson Pro',serif", fontSize: '.85rem', outline: 'none' },
  smallInput: { width: 56 },
  btn: { background: 'rgba(212,160,23,.12)', color: '#d4a017', border: '1px solid rgba(212,160,23,.3)', borderRadius: 8, padding: '.5rem 1rem', fontFamily: "'Cinzel',serif", fontSize: '.6rem', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  danger: { background: 'none', border: 'none', color: '#e03030', cursor: 'pointer', fontSize: '.85rem', padding: '.2rem .4rem' },
  label: { fontFamily: "'Cinzel',serif", fontSize: '.58rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#4a6880' },
}

export default function CategoryManager() {
  const [groupIdx, setGroupIdx] = useState(0)
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [newValue, setNewValue] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [fallbackChoice, setFallbackChoice] = useState('')
  const group = GROUPS[groupIdx]

  useEffect(() => { fetchItems() }, [groupIdx])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*')
      .eq('content_type', group.contentType).eq('dimension', group.dimension)
      .order('ordre', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  async function addItem() {
    const value = newValue.trim()
    if (!value) return
    if (items.some(i => i.value === value)) { alert('Cette valeur existe déjà dans cette catégorie.'); return }
    const ordre = items.length ? Math.max(...items.map(i => i.ordre)) + 1 : 0
    const { error } = await supabase.from('categories').insert([{
      content_type: group.contentType, dimension: group.dimension, value, label: value, ordre, actif: true,
    }])
    if (error) { alert('Erreur lors de la création : ' + error.message); return }
    setNewValue('')
    fetchItems()
  }

  async function patchItem(id: string, patch: Partial<Category>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    const { error } = await supabase.from('categories').update(patch).eq('id', id)
    if (error) alert('Erreur lors de la sauvegarde : ' + error.message)
  }

  // Renomme la valeur ET la répercute sur toutes les fiches existantes qui la portent —
  // un simple update en masse suffit ici (contrairement à cascadeFactionRename côté Factions)
  // car chaque dimension ne vit que dans une seule colonne texte d'une seule table.
  async function renameValue(item: Category, newVal: string) {
    const value = newVal.trim()
    if (!value || value === item.value) return
    if (items.some(i => i.id !== item.id && i.value === value)) { alert('Cette valeur existe déjà.'); return }
    const { error: catErr } = await supabase.from('categories').update({ value, label: value }).eq('id', item.id)
    if (catErr) { alert('Erreur lors du renommage : ' + catErr.message); return }
    const { error: cascErr } = await supabase.from(group.table).update({ [group.field]: value }).eq(group.field, item.value)
    if (cascErr) alert(`Le libellé a été renommé, mais la mise à jour des fiches existantes a échoué : ${cascErr.message}`)
    fetchItems()
  }

  function requestDelete(item: Category) {
    const fallbackOptions = items.filter(i => i.id !== item.id)
    if (fallbackOptions.length === 0) {
      if (confirm(`Supprimer "${item.value}" ? Il n'y a aucune autre valeur pour réaffecter les fiches existantes.`)) confirmDelete(item, '')
      return
    }
    setPendingDelete(item)
    setFallbackChoice(fallbackOptions[0].value)
  }

  async function confirmDelete(item: Category, fallback: string) {
    if (fallback) {
      const { error } = await supabase.from(group.table).update({ [group.field]: fallback }).eq(group.field, item.value)
      if (error) { alert('Erreur lors de la réaffectation des fiches : ' + error.message); return }
    }
    const { error: delErr } = await supabase.from('categories').delete().eq('id', item.id)
    if (delErr) { alert('Erreur lors de la suppression : ' + delErr.message); return }
    setPendingDelete(null)
    fetchItems()
  }

  // Réordonne par glisser-déposer — même patron que reorderFactions (factions/page.tsx) :
  // recalcule les index puis écrit "ordre" séquentiellement, avec alerte si une écriture échoue.
  async function reorderItems(fromId: string, toId: string) {
    const fromIdx = items.findIndex(i => i.id === fromId)
    const toIdx = items.findIndex(i => i.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const reordered = items.slice()
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setItems(reordered)
    let failures = 0
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].ordre !== i) {
        const { error } = await supabase.from('categories').update({ ordre: i }).eq('id', reordered[i].id)
        if (error) failures++
      }
    }
    if (failures > 0) alert("Le nouvel ordre n'a pas pu être enregistré entièrement.")
    fetchItems()
  }

  const sections = Array.from(new Set(GROUPS.map(g => g.section)))

  return (
    <div style={S.wrap}>
      <div style={S.body}>
        <div style={S.sidebar}>
          {sections.map(sec => (
            <div key={sec}>
              <div style={S.sectionTitle}>{sec}</div>
              {GROUPS.map((g, i) => g.section === sec && (
                <button key={`${g.contentType}-${g.dimension}`} style={S.groupBtn(i === groupIdx)} onClick={() => { setPendingDelete(null); setGroupIdx(i) }}>
                  {g.dimensionLabel}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={S.content}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.1rem', color: '#f0c040' }}>{group.section} — {group.dimensionLabel}</div>
              <div style={{ fontSize: '.75rem', color: '#4a6880', fontStyle: 'italic' }}>Glisse pour réordonner · clique un champ pour modifier</div>
            </div>
          </div>

          {loading ? (
            <div style={{ color: '#4a6880', fontStyle: 'italic' }}>Chargement…</div>
          ) : items.length === 0 ? (
            <div style={{ color: '#4a6880', fontStyle: 'italic', marginBottom: '1rem' }}>Aucune valeur pour l&apos;instant.</div>
          ) : (
            <div>
              {items.map(item => (
                <div key={item.id}>
                  <div style={S.row(draggingId === item.id)}
                    draggable
                    onDragStart={e => { setDraggingId(item.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id) }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={e => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); reorderItems(fromId, item.id) }}
                  >
                    <span style={{ color: '#4a6880', fontSize: '.75rem' }}>⠿</span>
                    <input defaultValue={item.emoji || ''} placeholder="🔹" style={{ ...S.input, ...S.smallInput, textAlign: 'center' }}
                      onBlur={e => e.target.value !== (item.emoji || '') && patchItem(item.id, { emoji: e.target.value })} />
                    <input type="color" value={item.color || '#7a9ab8'} style={{ width: 32, height: 32, border: 'none', borderRadius: 6, background: 'none', cursor: 'pointer' }}
                      onChange={e => patchItem(item.id, { color: e.target.value })} />
                    <input defaultValue={item.value} style={{ ...S.input, flex: 1 }}
                      onBlur={e => renameValue(item, e.target.value)} />
                    {group.hasCap && (
                      <input type="number" defaultValue={item.cap ?? ''} placeholder="Plafond" style={{ ...S.input, width: 84 }}
                        onBlur={e => { const v = e.target.value.trim(); patchItem(item.id, { cap: v ? parseInt(v, 10) : null }) }} />
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', ...S.label, cursor: 'pointer' }}>
                      <input type="checkbox" checked={item.actif} onChange={e => patchItem(item.id, { actif: e.target.checked })} />
                      Actif
                    </label>
                    <button style={S.danger} onClick={() => requestDelete(item)} title="Supprimer">✕</button>
                  </div>
                  {pendingDelete?.id === item.id && (
                    <div style={{ background: 'rgba(224,48,48,.08)', border: '1px solid rgba(224,48,48,.3)', borderRadius: 10, padding: '.7rem .9rem', marginTop: '-.2rem', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.78rem', color: '#e8eef5' }}>Réaffecter les fiches « {item.value} » vers :</span>
                      <select value={fallbackChoice} onChange={e => setFallbackChoice(e.target.value)} style={S.input}>
                        {items.filter(i => i.id !== item.id).map(i => <option key={i.id} value={i.value}>{i.value}</option>)}
                      </select>
                      <button style={S.btn} onClick={() => confirmDelete(item, fallbackChoice)}>Confirmer la suppression</button>
                      <button style={{ ...S.btn, background: 'none', border: '1px solid rgba(122,154,184,.3)', color: '#7a9ab8' }} onClick={() => setPendingDelete(null)}>Annuler</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
            <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Nouvelle valeur…" style={{ ...S.input, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && addItem()} />
            <button style={S.btn} onClick={addItem}>+ Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  )
}
