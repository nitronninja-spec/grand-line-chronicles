'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import { fetchCategoryFull, CategoryFull } from '@/lib/categories'
import GlobalSearch from '@/components/GlobalSearch'
import ImageLightbox from '@/components/ImageLightbox'

interface Ile {
  id: string
  nom: string
  emoji?: string
  region?: string
  climat?: string
  factions?: string[]
  chef?: string
  iles_parentes?: string[]
  est_archipel?: boolean
  est_detruite?: boolean
  description?: string
  photo?: string
  photos?: string[]
  gdoc?: string
  miro?: string
  ordre_manuel?: number | null
}

const FALLBACK_REGION_FULL: CategoryFull[] = [
  { value: 'East Blue', emoji: '', color: '#00c8ff', cap: null },
  { value: 'West Blue', emoji: '', color: '#4488ff', cap: null },
  { value: 'North Blue', emoji: '', color: '#a060ff', cap: null },
  { value: 'South Blue', emoji: '', color: '#40d060', cap: null },
  { value: 'Grand Line', emoji: '', color: '#d4a017', cap: null },
  { value: 'Red Line', emoji: '', color: '#ff8c40', cap: null },
  { value: 'New World', emoji: '', color: '#e03030', cap: null },
  { value: 'Région inconnue', emoji: '', color: '#7a9ab8', cap: null },
]
const PEUPLE = 'Peuple'
type SortMode = 'mer' | 'mer-rev' | 'az' | 'za' | 'manuel'

// "regions" inclut "Région inconnue" en dernière position — comme son index y est toujours
// le plus grand, elle finit toujours en fin de liste, exactement comme le repli -1→999 d'avant.
function sortIles(items: Ile[], mode: SortMode, regions: string[]) {
  return items.slice().sort((a, b) => {
    if (mode === 'az') return a.nom.localeCompare(b.nom)
    if (mode === 'za') return b.nom.localeCompare(a.nom)
    if (mode === 'manuel') return (a.ordre_manuel ?? Infinity) - (b.ordre_manuel ?? Infinity)
    const ai = regions.indexOf(a.region || '')
    const bi = regions.indexOf(b.region || '')
    const oa = ai === -1 ? 999 : ai
    const ob = bi === -1 ? 999 : bi
    return (mode === 'mer-rev' ? ob - oa : oa - ob) || a.nom.localeCompare(b.nom)
  })
}

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  header: { padding: '2.5rem 2rem 1.5rem', maxWidth: 1400, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.1rem', padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' },
  btnGold: { background: 'linear-gradient(135deg, #d4a017, #b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: '1px solid rgba(30,180,255,.4)', borderRadius: 18, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

export default function IlesPage() {
  const [list, setList] = useState<Ile[]>([])
  const [filtered, setFiltered] = useState<Ile[]>([])
  const [regionFilter, setRegionFilter] = useState('')
  const [factionFilter, setFactionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [dragOverUpload, setDragOverUpload] = useState(false)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [factions, setFactions] = useState<{ id: string; nom: string; emoji?: string }[]>([])
  const [personnages, setPersonnages] = useState<{ id: string; nom: string; emoji?: string; ile?: string; iles_liees?: { ile: string; notes: string }[] }[]>([])
  const [selected, setSelected] = useState<Ile | null>(null)
  const [showView, setShowView] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('mer')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Ile>>({
    nom: '', emoji: '🏝️', region: 'Grand Line', climat: '', factions: [], chef: '', iles_parentes: [], est_archipel: false, est_detruite: false, description: '', gdoc: '', miro: '', photos: []
  })
  const [regionFull, setRegionFull] = useState<CategoryFull[]>(FALLBACK_REGION_FULL)

  const REGIONS = regionFull.map(r => r.value)
  const REGION_COLORS: Record<string, string> = Object.fromEntries(regionFull.map(r => [r.value, r.color]))

  useEffect(() => {
    fetchList(); fetchFactions(); fetchPersonnages()
    fetchCategoryFull('iles', 'region', FALLBACK_REGION_FULL).then(setRegionFull)
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])

  useEffect(() => {
    let l = list
    if (search) l = l.filter(i => i.nom.toLowerCase().includes(search.toLowerCase()))
    if (regionFilter) l = l.filter(i => i.region === regionFilter)
    if (factionFilter) l = l.filter(i => i.factions?.includes(factionFilter))
    setFiltered(sortIles(l, sortMode, REGIONS))
  }, [list, search, regionFilter, factionFilter, sortMode, regionFull])

  async function fetchList() {
    const { data } = await supabase.from('iles').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  // Réordonne par glisser-déposer — même patron que reorderFactions (factions/page.tsx).
  // Scopé au niveau top (les îles rangées dans un archipel ne sont pas réordonnées ici).
  async function reorderItems(currentOrder: Ile[], fromId: string, toId: string) {
    const fromIdx = currentOrder.findIndex(x => x.id === fromId)
    const toIdx = currentOrder.findIndex(x => x.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const reordered = currentOrder.slice()
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    let failures = 0
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].ordre_manuel !== i) {
        const { error } = await supabase.from('iles').update({ ordre_manuel: i }).eq('id', reordered[i].id)
        if (error) failures++
      }
    }
    if (failures > 0) alert(`Le nouvel ordre n'a pas pu être enregistré entièrement.`)
    fetchList()
  }

  async function fetchFactions() {
    const { data } = await supabase.from('factions').select('id, nom, emoji').order('nom', { ascending: true })
    setFactions(data || [])
  }

  async function fetchPersonnages() {
    const { data } = await supabase.from('personnages').select('id, nom, emoji, ile, iles_liees').order('nom', { ascending: true })
    setPersonnages(data || [])
  }

  function openForm(ile?: Ile) {
    if (ile) { setForm({ ...ile, factions: ile.factions || [], iles_parentes: ile.iles_parentes || [], photos: ile.photos && ile.photos.length > 0 ? ile.photos : (ile.photo ? [ile.photo] : []) }); setEditId(ile.id) }
    else { setForm({ nom: '', emoji: '🏝️', region: 'Grand Line', climat: '', factions: [], chef: '', iles_parentes: [], est_archipel: false, est_detruite: false, description: '', gdoc: '', miro: '', photos: [] }); setEditId(null) }
    setPhotoFiles([])
    setPhotoPreviews([])
    setShowForm(true)
  }

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function addToFolder(folder: Ile, draggedIleId: string) {
    if (draggedIleId === folder.id) return
    const dragged = list.find(i => i.id === draggedIleId)
    if (!dragged) return
    const current = dragged.iles_parentes || []
    if (current.includes(folder.nom)) return
    await supabase.from('iles').update({ iles_parentes: [...current, folder.nom] }).eq('id', dragged.id)
    setExpandedFolders(prev => new Set(prev).add(folder.id))
    fetchList()
  }

  async function removeFromFolder(ile: Ile, folderNom: string) {
    const next = (ile.iles_parentes || []).filter(n => n !== folderNom)
    await supabase.from('iles').update({ iles_parentes: next }).eq('id', ile.id)
    fetchList()
  }

  async function removeFromAllFolders(ileId: string) {
    await supabase.from('iles').update({ iles_parentes: [] }).eq('id', ileId)
    fetchList()
  }

  function addPhotoFiles(files: File[]) {
    const imgFiles = files.filter(f => f.type.startsWith('image/'))
    setPhotoFiles(prev => [...prev, ...imgFiles])
    setPhotoPreviews(prev => [...prev, ...imgFiles.map(f => URL.createObjectURL(f))])
  }
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    addPhotoFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }
  function removeExistingPhoto(i: number) {
    setForm(f => ({ ...f, photos: (f.photos || []).filter((_, j) => j !== i) }))
  }
  function removeNewPhoto(i: number) {
    setPhotoPreviews(p => p.filter((_, j) => j !== i))
    setPhotoFiles(p => p.filter((_, j) => j !== i))
  }

  async function saveForm() {
    if (!form.nom?.trim()) { alert('Le nom est obligatoire !'); return }
    setUploading(true)
    let photos = form.photos || []
    for (const file of photoFiles) {
      const url = await uploadImage(file, 'iles')
      if (url) photos = [...photos, url]
    }
    const data = { ...form, photos, photo: photos[0] || null }
    const { error } = editId
      ? await supabase.from('iles').update(data).eq('id', editId)
      : await supabase.from('iles').insert([data])
    setUploading(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    setShowForm(false)
    fetchList()
  }

  async function deleteIle(id: string) {
    if (!confirm('Supprimer cette île ?')) return
    await supabase.from('iles').delete().eq('id', id)
    fetchList()
  }

  async function duplicateIle(ile: Ile) {
    const { id, ...rest } = ile
    void id
    await supabase.from('iles').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
    fetchList()
  }

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['DS','/despa'],['PDS','/pds'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Journaux','/journaux'],['Lore','/lore'],['Dashboard','/dashboard']]
  const personnageMap = new Map(personnages.map(p => [p.nom, p.id]))
  // Réciproque de personnages.ile (île natale) et personnages.iles_liees (liens multiples,
  // avec notes) — interrogée plutôt que dupliquée sur l'île, même principe que Lames/Fruits.
  function personnagesLiesA(ileNom: string) {
    return personnages
      .map(p => ({ p, link: (p.iles_liees || []).find(l => l.ile === ileNom), native: p.ile === ileNom }))
      .filter(x => x.link || x.native)
  }
  const byName = new Map(filtered.map(i => [i.nom, i]))
  function hasPresentArchipelParent(ile: Ile) {
    return (ile.iles_parentes || []).some(pname => { const p = byName.get(pname); return p && p.est_archipel })
  }
  const topLevel = filtered.filter(i => !hasPresentArchipelParent(i))
  function childrenOf(archipel: Ile) {
    return filtered.filter(i => i.id !== archipel.id && (i.iles_parentes || []).includes(archipel.nom))
  }

  function renderIleCard(ile: Ile, opts: { nested?: boolean; parentNom?: string; visited?: Set<string> } = {}): React.ReactNode {
    const visited = opts.visited || new Set<string>()
    if (visited.has(ile.id)) return null
    const nextVisited = new Set(visited); nextVisited.add(ile.id)
    const rc = REGION_COLORS[ile.region || ''] || '#00c8ff'
    const isFolder = !!ile.est_archipel
    const isDestroyed = !!ile.est_detruite
    const expanded = expandedFolders.has(ile.id)
    const children = isFolder ? childrenOf(ile) : []
    const isDragOver = dragOverId === ile.id

    return (
      <div key={ile.id}
        draggable
        onDragStart={e => { setDraggingId(ile.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ile.id) }}
        onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
        onDragOver={(isFolder || sortMode === 'manuel') ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } : undefined}
        onDragEnter={isFolder ? () => setDragOverId(ile.id) : undefined}
        onDragLeave={isFolder ? () => setDragOverId(prev => prev === ile.id ? null : prev) : undefined}
        onDrop={isFolder
          ? e => { e.preventDefault(); e.stopPropagation(); setDragOverId(null); addToFolder(ile, e.dataTransfer.getData('text/plain')) }
          : sortMode === 'manuel'
            ? e => { e.preventDefault(); e.stopPropagation(); const fromId = e.dataTransfer.getData('text/plain'); reorderItems(topLevel, fromId, ile.id) }
            : undefined}
        style={{background:'#0d2040',border:`1px solid ${isDragOver?'#d4a017':isDestroyed?'rgba(224,48,48,.35)':'rgba(30,120,200,.2)'}`,borderRadius:14,overflow:'hidden',transition:'all .2s',marginLeft:opts.nested?'1.5rem':0,cursor:'grab',opacity:isDestroyed?.7:1}}
        onMouseEnter={e=>{const el=e.currentTarget;el.style.borderColor=isDragOver?'#d4a017':isDestroyed?'rgba(224,48,48,.6)':rc;if(!opts.nested){el.style.transform='translateY(-5px)';el.style.boxShadow='0 18px 36px rgba(0,0,0,.4)'}}}
        onMouseLeave={e=>{const el=e.currentTarget;el.style.borderColor=isDragOver?'#d4a017':isDestroyed?'rgba(224,48,48,.35)':'rgba(30,120,200,.2)';if(!opts.nested){el.style.transform='none';el.style.boxShadow='none'}}}>
        {/* Banner */}
        <div style={{height:opts.nested?90:155,background:isDestroyed?'linear-gradient(135deg,#1a0d0d,#2a1010)':'linear-gradient(135deg,#071828,#0d2440)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',fontSize:opts.nested?'2.4rem':'4.5rem',overflow:'hidden',filter:isDestroyed?'grayscale(.8)':'none',cursor:(ile.photos&&ile.photos[0])?'zoom-in':'default'}}
          onClick={e => { if (ile.photos && ile.photos.length > 0) { e.stopPropagation(); setLightbox({ images: ile.photos, index: 0 }) } }}>
          {ile.photos && ile.photos[0] && <img loading="lazy" src={ile.photos[0]} alt={ile.nom} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:.55}} />}
          <span style={{position:'relative',zIndex:1,opacity:isDestroyed?.5:1}}>{isDestroyed?'💀':(ile.emoji||'🏝️')}</span>
          {ile.photos && ile.photos.length > 1 && <span style={{position:'absolute',bottom:6,left:6,background:'rgba(5,13,26,.75)',border:'1px solid rgba(255,255,255,.2)',borderRadius:100,padding:'.12rem .45rem',fontSize:'.58rem',fontFamily:"'Cinzel',serif",color:'#e8eef5',zIndex:1}}>📷 {ile.photos.length}</span>}
          <div style={{position:'absolute',top:'.6rem',right:'.6rem',display:'flex',gap:'.35rem'}}>
            {isDestroyed && <div style={{background:'rgba(224,48,48,.28)',border:'1px solid rgba(224,48,48,.5)',borderRadius:100,padding:'.2rem .6rem',fontFamily:"'Cinzel',serif",fontSize:'.5rem',letterSpacing:'.09em',textTransform:'uppercase',color:'#ff6060',zIndex:1}}>☠️ Détruite</div>}
            {isFolder && <div style={{background:'rgba(212,160,23,.22)',border:'1px solid rgba(212,160,23,.44)',borderRadius:100,padding:'.2rem .6rem',fontFamily:"'Cinzel',serif",fontSize:'.5rem',letterSpacing:'.09em',textTransform:'uppercase',color:'#f0c040',zIndex:1}}>📁 Archipel</div>}
            <div style={{background:`${rc}22`,border:`1px solid ${rc}44`,borderRadius:100,padding:'.2rem .6rem',fontFamily:"'Cinzel',serif",fontSize:'.5rem',letterSpacing:'.09em',textTransform:'uppercase',color:rc,zIndex:1}}>{ile.region}</div>
          </div>
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:60,background:`linear-gradient(to top,${isDestroyed?'#2a1010':'#0d2040'},transparent)`}} />
        </div>
        <div style={{padding:opts.nested?'.85rem':'1.1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.2rem'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:opts.nested?'.92rem':'1.08rem',fontWeight:700,color:isDestroyed?'#a06060':'#e8eef5',flex:1,textDecoration:isDestroyed?'line-through':'none',cursor:'pointer'}} onClick={() => { setSelected(ile); setShowView(true) }}>{ile.nom}</div>
            {isFolder && (
              <button onClick={() => toggleFolder(ile.id)} style={{background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.25)',borderRadius:8,padding:'.2rem .55rem',color:'#d4a017',cursor:'pointer',fontSize:'.68rem',fontFamily:"'Cinzel',serif",whiteSpace:'nowrap'}}>{expanded?'▾':'▸'} {children.length}</button>
            )}
          </div>
          {ile.climat && <div style={{fontSize:'.78rem',color:'#4a6880',marginBottom:'.6rem'}}>🌤 {ile.climat}</div>}
          {!opts.nested && (ile.iles_parentes || []).length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem',marginBottom:'.6rem'}}>
              {(ile.iles_parentes || []).map(pn => <a key={pn} href={`/iles?q=${encodeURIComponent(pn)}`} style={{fontSize:'.72rem',color:'#7a9ab8',textDecoration:'none'}}>↳ {pn}</a>)}
            </div>
          )}
          {opts.nested && opts.parentNom && (
            <button onClick={() => removeFromFolder(ile, opts.parentNom!)} style={{background:'none',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.15rem .5rem',color:'#ff6060',cursor:'pointer',fontSize:'.65rem',fontFamily:"'Cinzel',serif",marginBottom:'.5rem'}}>✕ Retirer de {opts.parentNom}</button>
          )}
          {(ile.factions || []).length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem',marginBottom:'.6rem'}}>
              {(ile.factions || []).map(fn => fn === PEUPLE
                ? <div key={fn} style={{fontSize:'.78rem',color:'#f0c040'}}>👥 Peuple</div>
                : <a key={fn} href={`/factions?q=${encodeURIComponent(fn)}`} style={{fontSize:'.78rem',color:'#f0c040',textDecoration:'none'}}>⚔️ {fn}</a>
              )}
            </div>
          )}
          {ile.chef && (
            personnageMap.has(ile.chef)
              ? <a href={`/personnages?open=${personnageMap.get(ile.chef)}`} style={{display:'block',fontSize:'.78rem',color:'#a060ff',marginBottom:'.6rem',textDecoration:'none'}}>👑 {ile.chef}</a>
              : <div style={{fontSize:'.78rem',color:'#a060ff',marginBottom:'.6rem'}}>👑 {ile.chef}</div>
          )}
          {ile.description && <div style={{fontSize:'.88rem',color:'#7a9ab8',lineHeight:1.6,fontStyle:'italic',marginBottom:'.75rem'}}>{ile.description}</div>}
          <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center'}}>
            {ile.gdoc && <a href={ile.gdoc} target="_blank" rel="noopener" style={{background:'rgba(66,133,244,.12)',color:'#6aabff',border:'1px solid rgba(66,133,244,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>📄 Doc</a>}
            {ile.miro && <a href={ile.miro} target="_blank" rel="noopener" style={{background:'rgba(255,196,0,.1)',color:'#ffc400',border:'1px solid rgba(255,196,0,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>🗒 Miro</a>}
            <div style={{marginLeft:'auto',display:'flex',gap:'.3rem'}}>
              <button onClick={() => duplicateIle(ile)} title="Dupliquer" style={{background:'rgba(160,96,255,.1)',border:'1px solid rgba(160,96,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#a060ff',cursor:'pointer',fontSize:'.7rem',fontFamily:"'Cinzel',serif"}}>⧉</button>
              <button onClick={() => openForm(ile)} style={{background:'rgba(0,200,255,.1)',border:'1px solid rgba(0,200,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#00c8ff',cursor:'pointer',fontSize:'.7rem',fontFamily:"'Cinzel',serif"}}>✏️</button>
              <button onClick={() => deleteIle(ile.id)} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem',fontFamily:"'Cinzel',serif"}}>🗑</button>
            </div>
          </div>
        </div>
        {isFolder && expanded && (
          <div style={{padding:'0 1.1rem 1.1rem',display:'flex',flexDirection:'column',gap:'.75rem'}}>
            {children.length === 0 && <div style={{fontSize:'.72rem',color:'#4a6880',fontStyle:'italic',border:'2px dashed rgba(30,120,200,.2)',borderRadius:10,padding:'.85rem',textAlign:'center'}}>Glisse une île ici pour la ranger dans cet archipel.</div>}
            {children.map(child => renderIleCard(child, { nested:true, parentNom: ile.nom, visited: nextVisited }))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus, select:focus { border-color: #d4a017 !important; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d4a017; border-radius: 3px; }
      `}</style>

      <nav style={S.nav}>
        <a href="/" style={S.logo}>
          <span style={{width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>☠</span>
          Grand Line
        </a>
        <div style={{flex:1,display:'flex',gap:'.3rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {navLinks.map(([l,h]) => (
            <a key={h} href={h} style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.06em',textTransform:'uppercase',color:h==='/iles'?'#f0c040':'#7a9ab8',textDecoration:'none',padding:'.38rem .6rem',borderRadius:6,whiteSpace:'nowrap',background:h==='/iles'?'rgba(212,160,23,.15)':'none'}}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{...S.btnGold,padding:'.38rem .85rem',textDecoration:'none',fontSize:'.62rem'}}>⚓ MJ</a>
      </nav>

      <div style={S.header}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.1em',color:'#7a9ab8',textTransform:'uppercase',marginBottom:'.4rem'}}>🏴‍☠️ › Îles & Territoires</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:700,background:'linear-gradient(135deg,#fff,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Îles & Territoires</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter une île</button>
        </div>
        <div style={{display:'flex',gap:'.65rem',marginBottom:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220,position:'relative'}}>
            <span style={{position:'absolute',left:'.75rem',top:'50%',transform:'translateY(-50%)',color:'#4a6880'}}>🔍</span>
            <input style={{...S.input,paddingLeft:'2.5rem'}} placeholder="Rechercher une île..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{display:'flex',gap:'.3rem',alignItems:'center'}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#4a6880'}}>Trier :</span>
            {([['mer','🌊 Ordre des mers'],['mer-rev','🌊 Inversé'],['az','A→Z'],['za','Z→A'],['manuel','Manuel (glisser-déposer)']] as [SortMode,string][]).map(([mode,label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} style={{background:sortMode===mode?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${sortMode===mode?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .7rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.05em',color:sortMode===mode?'#f0c040':'#7a9ab8',cursor:'pointer',whiteSpace:'nowrap'}}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
          <button onClick={() => setRegionFilter('')} style={{background:regionFilter===''?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${regionFilter===''?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:regionFilter===''?'#f0c040':'#7a9ab8',cursor:'pointer'}}>Toutes</button>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)} style={{background:regionFilter===r?`${REGION_COLORS[r]}22`:'#0a1829',border:`1px solid ${regionFilter===r?REGION_COLORS[r]:'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:regionFilter===r?REGION_COLORS[r]:'#7a9ab8',cursor:'pointer'}}>{r}</button>
          ))}
        </div>
        {factions.length > 0 && (
          <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center',marginBottom:'1.25rem'}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.1em',textTransform:'uppercase',color:'#4a6880',marginRight:'.2rem'}}>Trier par faction :</span>
            <button onClick={() => setFactionFilter('')} style={{background:factionFilter===''?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${factionFilter===''?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:factionFilter===''?'#f0c040':'#7a9ab8',cursor:'pointer'}}>Toutes</button>
            {factions.map(f => (
              <button key={f.id} onClick={() => setFactionFilter(f.nom)} style={{background:factionFilter===f.nom?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${factionFilter===f.nom?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:factionFilter===f.nom?'#f0c040':'#7a9ab8',cursor:'pointer'}}>{f.emoji||'⚔️'} {f.nom}</button>
            ))}
          </div>
        )}
      </div>

      {draggingId && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); removeFromAllFolders(draggingId); setDraggingId(null) }}
          style={{margin:'0 2rem 1.25rem',maxWidth:1400,marginLeft:'auto',marginRight:'auto',border:'2px dashed rgba(224,48,48,.4)',borderRadius:12,padding:'.85rem 1.25rem',textAlign:'center',color:'#ff6060',fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.08em',textTransform:'uppercase',background:'rgba(224,48,48,.06)'}}
        >📤 Déposer ici pour retirer cette île de tous ses dossiers</div>
      )}

      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:'5rem 2rem',color:'#4a6880'}}>
            <div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.4}}>🏝️</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Aucune île</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter la première</button>
          </div>
        )}
        {(() => {
          const groupBySea = sortMode === 'mer' || sortMode === 'mer-rev'
          let lastRegion: string | undefined | null = undefined
          const nodes: React.ReactNode[] = []
          topLevel.forEach(ile => {
            if (groupBySea && ile.region !== lastRegion) {
              lastRegion = ile.region
              const rc = REGION_COLORS[ile.region || ''] || '#7a9ab8'
              nodes.push(
                <div key={`divider-${ile.region}-${ile.id}`} style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'.75rem',margin:'.4rem 0'}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.65rem',letterSpacing:'.14em',textTransform:'uppercase',color:rc,whiteSpace:'nowrap'}}>🌊 {ile.region || 'Région inconnue'}</div>
                  <div style={{flex:1,height:1,background:`${rc}33`}} />
                </div>
              )
            }
            nodes.push(renderIleCard(ile))
          })
          return nodes
        })()}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={S.modal}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{editId?'✏️ Modifier l\'Île':'✚ Nouvelle Île'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem'}}>✕</button>
            </div>
            <div style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.1rem'}}>
              {/* Photos */}
              <div>
                <label style={S.label}>🖼️ Images / Photos de l'île</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.6rem'}}>
                  {(form.photos || []).map((src, i) => (
                    <div key={`existing-${i}`} style={{aspectRatio:'1',borderRadius:8,overflow:'hidden',position:'relative',border:i===0?'2px solid #d4a017':'2px solid rgba(30,120,200,.2)',cursor:'zoom-in'}}
                      onClick={() => setLightbox({ images: (form.photos || []), index: i })}>
                      <img loading="lazy" src={src} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      <button onClick={e => { e.stopPropagation(); removeExistingPhoto(i) }}
                        style={{position:'absolute',top:2,right:2,background:'rgba(224,48,48,.85)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',fontSize:'.6rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                      {i===0 && <div style={{position:'absolute',bottom:2,left:2,background:'rgba(212,160,23,.85)',borderRadius:4,fontFamily:"'Cinzel',serif",fontSize:'.45rem',color:'#050d1a',padding:'1px 4px'}}>Principale</div>}
                    </div>
                  ))}
                  {photoPreviews.map((src, i) => (
                    <div key={`new-${i}`} style={{aspectRatio:'1',borderRadius:8,overflow:'hidden',position:'relative',border:((form.photos||[]).length===0 && i===0)?'2px solid #d4a017':'2px solid rgba(30,120,200,.2)'}}>
                      <img loading="lazy" src={src} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      <button onClick={() => removeNewPhoto(i)}
                        style={{position:'absolute',top:2,right:2,background:'rgba(224,48,48,.85)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',fontSize:'.6rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                    </div>
                  ))}
                  {((form.photos||[]).length + photoPreviews.length) < 8 && (
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOverUpload(true) }}
                      onDragLeave={() => setDragOverUpload(false)}
                      onDrop={e => { e.preventDefault(); setDragOverUpload(false); addPhotoFiles(Array.from(e.dataTransfer.files || [])) }}
                      style={{aspectRatio:'1',borderRadius:8,border:dragOverUpload?'2px dashed #d4a017':'2px dashed rgba(30,120,200,.3)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',background:dragOverUpload?'rgba(212,160,23,.1)':'#0d2040',color:'#4a6880',fontSize:'.6rem',fontFamily:"'Cinzel',serif",gap:'.3rem',textAlign:'center'}}>
                      <input type="file" accept="image/*,.gif" multiple style={{display:'none'}} onChange={handlePhoto} />
                      <span style={{fontSize:'1.5rem'}}>➕</span>
                      <span>Clique ou glisse</span>
                    </label>
                  )}
                </div>
                <div style={{marginTop:'.65rem'}}>
                  <label style={{...S.label,color:'#7a9ab8'}}>Ou URL directe</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.jpg" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) { setForm(f => ({ ...f, photos: [...(f.photos || []), val] })); (e.target as HTMLInputElement).value = '' }
                    }
                  }} />
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'.85rem',alignItems:'end'}}>
                <div><label style={S.label}>Nom de l'île *</label><input style={S.input} value={form.nom||''} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Windfall Island" /></div>
                <div><label style={S.label}>Emoji</label><input style={{...S.input,width:70,fontSize:'1.4rem',textAlign:'center'}} value={form.emoji||'🏝️'} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.85rem'}}>
                <div><label style={S.label}>Région</label>
                  <select style={{...S.input}} value={form.region||'Grand Line'} onChange={e=>setForm(f=>({...f,region:e.target.value}))}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Climat</label><input style={S.input} value={form.climat||''} onChange={e=>setForm(f=>({...f,climat:e.target.value}))} placeholder="Tropical, tempétueux..." /></div>
              </div>
              <div>
                <label style={{...S.label,color:'#7a9ab8'}}>👑 Chef de l&apos;île</label>
                <select style={{...S.input}} value={form.chef || ''} onChange={e => setForm(f => ({...f, chef: e.target.value}))}>
                  <option value="">— Aucun —</option>
                  {personnages.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>

              {/* Factions liées (multi) */}
              <div>
                <label style={S.label}>⚔️ Factions liées</label>
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                  {[{id:'__peuple',nom:PEUPLE}, ...factions].map(fac => {
                    const active = (form.factions || []).includes(fac.nom)
                    return (
                      <button key={fac.id} type="button" onClick={() => setForm(f => {
                        const current = f.factions || []
                        return { ...f, factions: active ? current.filter(n => n !== fac.nom) : [...current, fac.nom] }
                      })} style={{background:active?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${active?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.35rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',color:active?'#f0c040':'#7a9ab8',cursor:'pointer'}}>
                        {active?'✓ ':''}{fac.nom === PEUPLE ? '👥 Peuple' : fac.nom}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Archipel toggle */}
              <label style={{display:'flex',alignItems:'center',gap:'.6rem',background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'.85rem 1.1rem',cursor:'pointer'}}>
                <input type="checkbox" checked={!!form.est_archipel} onChange={e => setForm(f => ({...f, est_archipel: e.target.checked}))} style={{width:18,height:18,accentColor:'#d4a017',cursor:'pointer'}} />
                <div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',color:'#e8eef5',fontWeight:700}}>📁 Archipel / Groupe d&apos;îles</div>
                  <div style={{fontSize:'.75rem',color:'#4a6880'}}>Cette île devient un dossier pouvant contenir des sous-îles.</div>
                </div>
              </label>

              {/* Détruite toggle */}
              <label style={{display:'flex',alignItems:'center',gap:'.6rem',background:'#0d2040',border:'1px solid rgba(224,48,48,.2)',borderRadius:10,padding:'.85rem 1.1rem',cursor:'pointer'}}>
                <input type="checkbox" checked={!!form.est_detruite} onChange={e => setForm(f => ({...f, est_detruite: e.target.checked}))} style={{width:18,height:18,accentColor:'#ff6060',cursor:'pointer'}} />
                <div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',color:'#ff6060',fontWeight:700}}>☠️ Détruite</div>
                  <div style={{fontSize:'.75rem',color:'#4a6880'}}>Marque cette île ou cet archipel comme détruit(e).</div>
                </div>
              </label>

              {/* Îles parentes (multi) */}
              <div>
                <label style={S.label}>↳ Îles parentes (sous-catégorie de)</label>
                {list.filter(i => i.id !== editId && i.est_archipel).length === 0 && (
                  <div style={{fontSize:'.8rem',color:'#4a6880',fontStyle:'italic'}}>Aucun archipel créé pour l&apos;instant — coche &quot;Archipel&quot; sur une île pour pouvoir en ranger d&apos;autres dedans.</div>
                )}
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                  {list.filter(i => i.id !== editId && i.est_archipel).map(parent => {
                    const active = (form.iles_parentes || []).includes(parent.nom)
                    return (
                      <button key={parent.id} type="button" onClick={() => setForm(f => {
                        const current = f.iles_parentes || []
                        return { ...f, iles_parentes: active ? current.filter(n => n !== parent.nom) : [...current, parent.nom] }
                      })} style={{background:active?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${active?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.35rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',color:active?'#f0c040':'#7a9ab8',cursor:'pointer'}}>
                        {active?'✓ ':''}📁 {parent.nom}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div><label style={S.label}>Description</label><textarea style={{...S.input,minHeight:100,resize:'vertical',lineHeight:1.7}} value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description de l'île..." /></div>
              <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'1.1rem'}}>
                <div style={{...S.label,marginBottom:'.75rem'}}>🔗 Liens Externes</div>
                <div style={{marginBottom:'.65rem'}}><label style={{...S.label,color:'#7a9ab8'}}>📄 Google Doc</label><input style={S.input} value={form.gdoc||''} onChange={e=>setForm(f=>({...f,gdoc:e.target.value}))} placeholder="https://docs.google.com/..." /></div>
                <div><label style={{...S.label,color:'#7a9ab8'}}>🗒 Miro Board</label><input style={S.input} value={form.miro||''} onChange={e=>setForm(f=>({...f,miro:e.target.value}))} placeholder="https://miro.com/..." /></div>
              </div>
            </div>
            <div style={{padding:'1.1rem 1.75rem',borderTop:'1px solid rgba(30,120,200,.2)',display:'flex',gap:'.65rem',justifyContent:'flex-end',position:'sticky',bottom:0,background:'#0a1829',borderRadius:'0 0 18px 18px'}}>
              <button style={S.btnCyan} onClick={()=>setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm} disabled={uploading}>{uploading?'⏳ Upload...':'💾 Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {showView && selected && (() => {
        const rc = REGION_COLORS[selected.region || ''] || '#00c8ff'
        const lies = personnagesLiesA(selected.nom)
        return (
          <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowView(false) }}>
            <div style={{ ...S.modal, maxWidth: 900 }}>
              <div style={{ position:'relative', height:220, background:'linear-gradient(135deg,#071828,#0d2440)', borderRadius:'18px 18px 0 0', overflow:'hidden', display:'flex', alignItems:'flex-end', padding:'1.75rem' }}>
                {selected.photos && selected.photos[0] && (
                  <img loading="lazy" src={selected.photos[0]} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.42, display:'block' }} />
                )}
                {(!selected.photos || !selected.photos[0]) && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11rem', opacity:.07 }}>{selected.emoji || '🏝️'}</div>
                )}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:120, background:'linear-gradient(to top,#0a1829,transparent)' }} />
                <button onClick={() => setShowView(false)} style={{ position:'absolute', top:'.9rem', right:'.9rem', background:'rgba(5,13,26,.75)', border:'1px solid rgba(30,120,200,.2)', color:'#7a9ab8', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'.9rem', zIndex:5 }}>✕</button>
                <div style={{ position:'relative', zIndex:2 }}>
                  <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'1.85rem', fontWeight:700, color:'#fff', marginBottom:'.35rem' }}>{selected.emoji} {selected.nom}</div>
                  <span style={{ background:`${rc}22`, color:rc, border:`1px solid ${rc}44`, borderRadius:100, padding:'.15rem .65rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.1em', textTransform:'uppercase' }}>{selected.region}</span>
                </div>
              </div>

              <div style={{ padding:'1.75rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.1rem', marginBottom:'1.25rem' }}>
                  {[
                    { l:'🌤 Climat', v: selected.climat || '—', c:'#7a9ab8' },
                    { l:'👑 Chef', v: selected.chef || '—', c:'#a060ff' },
                    { l:'⚔️ Factions', v: (selected.factions && selected.factions.length > 0) ? selected.factions.join(', ') : '—', c:'#f0c040' },
                    { l:'🏝️ Îles parentes', v: (selected.iles_parentes && selected.iles_parentes.length > 0) ? selected.iles_parentes.join(', ') : '—', c:'#40d060' },
                  ].map(({l,v,c}) => (
                    <div key={l} style={{ background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10, padding:'1rem' }}>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#4a6880', marginBottom:'.35rem' }}>{l}</div>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:'1.05rem', fontWeight:700, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>

                {selected.photos && selected.photos.length > 1 && (
                  <>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
                      📸 Galerie ({selected.photos.length} photos) <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} />
                    </div>
                    <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
                      {selected.photos.map((ph,i) => (
                        <div key={i} style={{ width:70, height:70, borderRadius:8, overflow:'hidden', border:`2px solid ${i===0?'#d4a017':'rgba(30,120,200,.2)'}`, cursor:'zoom-in' }}
                          onClick={() => setLightbox({ images: selected.photos!, index: i })}>
                          <img loading="lazy" src={ph} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selected.description && (
                  <>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>📖 Description <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} /></div>
                    <p style={{ fontSize:'1rem', color:'#7a9ab8', lineHeight:1.8, marginBottom:'1.25rem', fontStyle:'italic' }}>{selected.description}</p>
                  </>
                )}

                {/* Personnages liés (île natale + îles liées) */}
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
                  👤 Personnages liés ({lies.length}) <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} />
                </div>
                {lies.length === 0 ? (
                  <div style={{ fontSize:'.85rem', color:'#4a6880', fontStyle:'italic', marginBottom:'1.25rem' }}>Aucun personnage lié à cette île pour l&apos;instant.</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'.6rem', marginBottom:'1.25rem' }}>
                    {lies.map(({ p, link, native }) => (
                      <div key={p.id} style={{ background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10, padding:'.75rem .9rem', display:'flex', gap:'.65rem', alignItems:'flex-start' }}>
                        <span style={{ fontSize:'1.3rem', flexShrink:0 }}>{p.emoji || '👤'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:'.4rem', alignItems:'center', flexWrap:'wrap' }}>
                            <a href={`/personnages?open=${p.id}`} style={{ color:'#e8eef5', textDecoration:'none', fontFamily:"'Cinzel',serif", fontSize:'.85rem', fontWeight:700 }}>{p.nom}</a>
                            {native && <span style={{ background:'rgba(64,208,96,.15)', color:'#40d060', border:'1px solid rgba(64,208,96,.3)', borderRadius:100, padding:'.1rem .5rem', fontFamily:"'Cinzel',serif", fontSize:'.5rem', letterSpacing:'.08em', textTransform:'uppercase' }}>Île natale</span>}
                          </div>
                          {link?.notes && <p style={{ fontSize:'.82rem', color:'#7a9ab8', lineHeight:1.6, fontStyle:'italic', marginTop:'.3rem' }}>{link.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                  {selected.gdoc && <a href={selected.gdoc} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:'.45rem', borderRadius:9, padding:'.55rem .95rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', textDecoration:'none', background:'rgba(66,133,244,.15)', color:'#6aabff', border:'1px solid rgba(66,133,244,.3)' }}>📄 Google Doc</a>}
                  {selected.miro && <a href={selected.miro} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:'.45rem', borderRadius:9, padding:'.55rem .95rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', textDecoration:'none', background:'rgba(255,196,0,.12)', color:'#ffc400', border:'1px solid rgba(255,196,0,.3)' }}>🗒 Miro Board</a>}
                  <button onClick={() => { setShowView(false); openForm(selected) }} style={{ ...S.btnCyan, marginLeft:'auto' }}>✏️ Modifier</button>
                  <button onClick={() => { setShowView(false); deleteIle(selected.id) }} style={{ background:'rgba(224,48,48,.12)', color:'#ff6060', border:'1px solid rgba(224,48,48,.3)', borderRadius:10, padding:'.7rem 1.4rem', fontFamily:"'Cinzel',serif", fontSize:'.72rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, cursor:'pointer' }}>🗑 Supprimer</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} onIndexChange={i => setLightbox(lb => lb ? { ...lb, index: i } : lb)} />}
    </div>
  )
}
