'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'
import ImageCropper from '@/components/ImageCropper'

interface PersonnageRang { faction: string; rang: string }
interface Personnage {
  id: string
  nom: string
  surnom?: string
  emoji?: string
  photos?: string[]
  type: string
  equipage?: string
  prime?: string
  condition_prime?: string
  titre_mondial?: string
  origine?: string
  ile?: string
  factions?: string[]
  rang?: string
  rangs?: PersonnageRang[]
  statut?: string
  fruit?: string
  tags?: string
  description?: string
  historique?: string
  techniques?: string
  gdoc?: string
  miro?: string
  fav?: boolean
}

interface LinkedItem { id: string; nom: string; proprietaire?: string; type?: string }
const FRUIT_TYPE_ORDER = ['Paramecia', 'Logia', 'Zoan', 'Mythical']
interface FactionRef { id: string; nom: string; rangs?: { nom: string; ordre: number }[] }

const TYPE_COLORS: Record<string, string> = {
  pj: '#00c8ff', pnj: '#d4a017', antagoniste: '#e03030', allié: '#40d060', ambivalent: '#a060ff'
}
const STATUT_COLORS: Record<string, string> = {
  vivant: '#40d060', mort: '#ff6060', disparu: '#ffb060', inconnu: '#a0a0c0'
}
const CONDITION_PRIME_LABELS: Record<string, string> = {
  mort_ou_vif: 'Mort ou Vif', mort_uniquement: 'Mort uniquement', vif_uniquement: 'Vif uniquement', non_recherche: 'Non recherché'
}
const TITRE_MONDIAL: Record<string, { label: string; icon: string; color: string }> = {
  'Empereur': { label: 'Empereur', icon: '👑', color: '#e03030' },
  'Amiral': { label: 'Amiral', icon: '⚓', color: '#00c8ff' },
  'Vice-Amiral': { label: 'Vice-Amiral', icon: '🎖️', color: '#4488ff' },
}
type SortMode = 'defaut' | 'prime' | 'groupe'
function parsePrime(p?: string) { return parseInt((p || '0').replace(/[^\d]/g, ''), 10) || 0 }
function personnageRangs(p: Personnage): PersonnageRang[] {
  if (p.rangs !== undefined) return p.rangs
  if (p.rang) return [{ faction: p.equipage || '', rang: p.rang }]
  return []
}
function sortPersonnages(items: Personnage[], mode: SortMode) {
  if (mode === 'prime') return items.slice().sort((a, b) => parsePrime(b.prime) - parsePrime(a.prime))
  return items
}
function personnageGroups(p: Personnage): string[] {
  const set = new Set<string>()
  ;(p.factions || []).forEach(f => f && set.add(f))
  if (p.equipage) set.add(p.equipage)
  return Array.from(set)
}
function getRangOrdreForFaction(p: Personnage, factionNom: string, factions: FactionRef[]): number {
  const entry = personnageRangs(p).find(r => r.faction === factionNom)
  if (!entry) return Infinity
  const match = factions.find(f => f.nom === factionNom)?.rangs?.find(r => r.nom === entry.rang)
  return match ? match.ordre : Infinity
}
interface GroupSection { faction: string; members: Personnage[] }
function buildGroupSections(items: Personnage[], factions: FactionRef[]): GroupSection[] {
  const map = new Map<string, Personnage[]>()
  items.forEach(p => {
    const groups = personnageGroups(p)
    const keys = groups.length > 0 ? groups : ['']
    keys.forEach(g => {
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    })
  })
  const names = Array.from(map.keys())
  const hasEmperor = (g: string) => (map.get(g) || []).some(p => p.titre_mondial === 'Empereur')
  names.sort((a, b) => {
    if (a === '' || b === '') return a === '' ? 1 : (b === '' ? -1 : 0)
    const ea = hasEmperor(a) ? 0 : 1
    const eb = hasEmperor(b) ? 0 : 1
    if (ea !== eb) return ea - eb
    return a.localeCompare(b)
  })
  return names.map(g => ({
    faction: g,
    members: (map.get(g) || []).slice().sort((a, b) => {
      const ea = a.titre_mondial === 'Empereur' ? 0 : 1
      const eb = b.titre_mondial === 'Empereur' ? 0 : 1
      if (ea !== eb) return ea - eb
      const ro = getRangOrdreForFaction(a, g, factions) - getRangOrdreForFaction(b, g, factions)
      if (ro !== 0) return ro
      const da = a.statut === 'mort' ? 1 : 0
      const db = b.statut === 'mort' ? 1 : 0
      if (da !== db) return da - db
      return a.nom.localeCompare(b.nom)
    })
  }))
}

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  header: { padding: '2.5rem 2rem 1.5rem', maxWidth: 1400, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.1rem', padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' },
  card: { background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all .3s' },
  btnGold: { background: 'linear-gradient(135deg, #d4a017, #b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: '1px solid rgba(30,180,255,.4)', borderRadius: 18, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

export default function PersonnagesPage() {
  const [list, setList] = useState<Personnage[]>([])
  const [filtered, setFiltered] = useState<Personnage[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selected, setSelected] = useState<Personnage | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [iles, setIles] = useState<{ id: string; nom: string; region?: string }[]>([])
  const [factions, setFactions] = useState<FactionRef[]>([])
  const [fruits, setFruits] = useState<LinkedItem[]>([])
  const [despas, setDespas] = useState<LinkedItem[]>([])
  const [lames, setLames] = useState<LinkedItem[]>([])
  const [cristaux, setCristaux] = useState<LinkedItem[]>([])
  const [factionFilter, setFactionFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('groupe')
  const [form, setForm] = useState<Partial<Personnage>>({
    nom: '', surnom: '', emoji: '👤', type: 'pnj', statut: 'vivant',
    prime: '0', condition_prime: 'mort_ou_vif', titre_mondial: '', origine: '', ile: '', factions: [], rangs: [], equipage: '', fruit: 'Aucun',
    tags: '', description: '', historique: '', techniques: '', gdoc: '', miro: ''
  })
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [cropTarget, setCropTarget] = useState<{ kind: 'new'; index: number; file: File } | { kind: 'existing'; index: number; file: File } | null>(null)
  const [cropLoading, setCropLoading] = useState<number | null>(null)
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    fetchList(); fetchIles(); fetchFactions(); fetchLinkedCatalogs()
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setSearch(q)
    const newFaction = params.get('newFaction')
    if (newFaction) {
      openForm()
      setForm(f => ({ ...f, factions: [newFaction] }))
    }
  }, [])

  useEffect(() => {
    if (autoOpenedRef.current || list.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const openId = params.get('open')
    if (openId) {
      const p = list.find(x => x.id === openId)
      if (p) { setSelected(p); setShowView(true) }
    }
    autoOpenedRef.current = true
  }, [list])

  async function fetchIles() {
    const { data } = await supabase.from('iles').select('id, nom, region').order('nom', { ascending: true })
    setIles(data || [])
  }

  async function fetchFactions() {
    const { data } = await supabase.from('factions').select('id, nom, rangs').order('nom', { ascending: true })
    setFactions(data || [])
  }

  async function fetchLinkedCatalogs() {
    const [fr, d, l, c] = await Promise.all([
      supabase.from('fruits').select('id, nom, proprietaire, type'),
      supabase.from('despas').select('id, nom, proprietaire'),
      supabase.from('lames').select('id, nom, proprietaire'),
      supabase.from('cristaux_primordiaux').select('id, nom, proprietaire'),
    ])
    setFruits(fr.data || [])
    setDespas(d.data || [])
    setLames(l.data || [])
    setCristaux(c.data || [])
  }

  useEffect(() => {
    let l = list
    if (search) l = l.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()) || (p.surnom||'').toLowerCase().includes(search.toLowerCase()))
    if (typeFilter) l = l.filter(p => p.type === typeFilter)
    if (factionFilter) l = l.filter(p => p.factions?.includes(factionFilter))
    setFiltered(l)
  }, [list, search, typeFilter, factionFilter])

  async function fetchList() {
    const { data } = await supabase.from('personnages').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  function openForm(p?: Personnage) {
    if (p) {
      setForm({ ...p, rangs: personnageRangs(p) })
      setEditId(p.id)
    } else {
      setForm({ nom: '', surnom: '', emoji: '👤', type: 'pnj', statut: 'vivant', prime: '0', condition_prime: 'mort_ou_vif', titre_mondial: '', origine: '', ile: '', factions: [], rangs: [], equipage: '', fruit: 'Aucun', tags: '', description: '', historique: '', techniques: '', gdoc: '', miro: '' })
      setEditId(null)
    }
    setPhotoFiles([])
    setPhotoPreviews([])
    setShowForm(true)
  }

  function addPhotoFiles(files: File[]) {
    const imgFiles = files.filter(f => f.type.startsWith('image/'))
    setPhotoFiles(prev => [...prev, ...imgFiles])
    setPhotoPreviews(prev => [...prev, ...imgFiles.map(f => URL.createObjectURL(f))])
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function cropExistingPhoto(i: number) {
    const url = (form.photos || [])[i]
    if (!url) return
    setCropLoading(i)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
      setCropTarget({ kind: 'existing', index: i, file })
    } finally {
      setCropLoading(null)
    }
  }

  async function onCropDone(cropped: File) {
    if (!cropTarget) return
    if (cropTarget.kind === 'new') {
      setPhotoFiles(p => p.map((f, j) => j === cropTarget.index ? cropped : f))
      setPhotoPreviews(p => p.map((src, j) => j === cropTarget.index ? URL.createObjectURL(cropped) : src))
    } else {
      setCropLoading(cropTarget.index)
      const url = await uploadImage(cropped, 'personnages')
      setCropLoading(null)
      if (url) {
        setForm(f => ({ ...f, photos: (f.photos || []).map((src, j) => j === cropTarget.index ? url : src) }))
      }
    }
    setCropTarget(null)
  }

  async function saveForm() {
    if (!form.nom?.trim()) { alert('Le nom est obligatoire !'); return }
    setUploading(true)
    let photos = form.photos || []
    for (const file of photoFiles) {
      const url = await uploadImage(file, 'personnages')
      if (url) photos = [...photos, url]
    }
    const data = { ...form, photos }
    const { error } = editId
      ? await supabase.from('personnages').update(data).eq('id', editId)
      : await supabase.from('personnages').insert([data])
    setUploading(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    setShowForm(false)
    fetchList()
  }

  async function deletePerso(id: string) {
    if (!confirm('Supprimer ce personnage ?')) return
    await supabase.from('personnages').delete().eq('id', id)
    setShowView(false)
    fetchList()
  }

  async function duplicatePerso(p: Personnage) {
    const { id, ...rest } = p
    void id
    await supabase.from('personnages').insert([{ ...rest, nom: rest.nom + ' (copie)', fav: false }])
    fetchList()
  }

  async function toggleFav(p: Personnage) {
    await supabase.from('personnages').update({ fav: !p.fav }).eq('id', p.id)
    fetchList()
  }

  const navLinks = [
    ['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'],
    ['Despas', '/despas'], ['Lames', '/lames'], ['Cristaux', '/cristaux'],
    ['Îles', '/iles'], ['Factions', '/factions'], ['Journaux', '/journaux'],
    ['Lore', '/lore'], ['Dashboard', '/dashboard']
  ]

  function renderCard(p: Personnage, key: string) {
    const isMort = p.statut === 'mort'
    const tm = p.titre_mondial ? TITRE_MONDIAL[p.titre_mondial] : null
    const linkedDespa = despas.find(d => d.proprietaire === p.nom)
    return (
      <div key={key} style={{ ...S.card, ...(tm ? { border:`2px solid ${tm.color}`, boxShadow:`0 0 22px ${tm.color}33` } : {}) }}
        onMouseEnter={e => { const el = e.currentTarget; el.style.transform='translateY(-7px)'; if(!tm) el.style.borderColor='#d4a017'; el.style.boxShadow= tm ? `0 0 30px ${tm.color}55` : '0 20px 40px rgba(0,0,0,.5)' }}
        onMouseLeave={e => { const el = e.currentTarget; el.style.transform='none'; if(!tm) el.style.borderColor='rgba(30,120,200,.2)'; el.style.boxShadow= tm ? `0 0 22px ${tm.color}33` : 'none' }}
      >
        {/* Image */}
        <div style={{ width:'100%', height:195, overflow:'hidden', background:'linear-gradient(135deg,#0a1829,#050d1a)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem', cursor:'pointer' }}
          onClick={() => { setSelected(p); setShowView(true) }}>
          {p.photos && p.photos[0]
            ? <img src={p.photos[0]} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top', display:'block', position:'absolute', inset:0, filter: isMort ? 'grayscale(1)' : 'none', opacity: isMort ? .5 : 1 }} />
            : null}
          <span style={{ position:'relative', zIndex:1, opacity: p.photos && p.photos[0] ? 0 : 1 }}>{p.emoji || '👤'}</span>
          {isMort && <span style={{ position:'absolute', fontSize:'3.2rem', opacity:.85, zIndex:2, filter:'drop-shadow(0 2px 6px rgba(0,0,0,.8))' }}>☠️</span>}
          {tm && (
            <div style={{ position:'absolute', top:8, left:8, zIndex:3, background:`${tm.color}dd`, color:'#050d1a', borderRadius:100, padding:'.2rem .6rem', fontFamily:"'Cinzel',serif", fontSize:'.55rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'.3rem' }}>
              {tm.icon} {tm.label}
            </div>
          )}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:55, background:'linear-gradient(to top,#0d2040,transparent)', pointerEvents:'none' }} />
        </div>

        <div style={{ padding:'1.1rem' }}>
          {/* Type badge */}
          <div style={{ display:'inline-block', borderRadius:100, padding:'.18rem .6rem', fontFamily:"'Cinzel',serif", fontSize:'.52rem', letterSpacing:'.09em', textTransform:'uppercase', marginBottom:'.45rem', background:`${TYPE_COLORS[p.type]}22`, color:TYPE_COLORS[p.type], border:`1px solid ${TYPE_COLORS[p.type]}44` }}>
            {p.type.toUpperCase()}
          </div>

          <div style={{ fontFamily:"'Cinzel',serif", fontSize:'1.05rem', fontWeight:700, color: isMort ? '#7a9ab8' : '#e8eef5', textDecoration: isMort ? 'line-through' : 'none', marginBottom:'.12rem', cursor:'pointer' }} onClick={() => { setSelected(p); setShowView(true) }}>
            {p.nom}
          </div>
          {p.surnom && <div style={{ fontStyle:'italic', color:'#7a9ab8', fontSize:'.82rem', marginBottom:'.3rem' }}>"{p.surnom}"</div>}
          {personnageRangs(p).length > 0 && (
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.68rem', color:'#a060ff', marginBottom:'.5rem' }}>
              {personnageRangs(p).map(r => `🎖️ ${r.rang}`).join('  ·  ')}
            </div>
          )}

          <div style={{ fontSize:'.82rem', color:'#7a9ab8', marginBottom:'.15rem' }}>⭐ <span style={{ color:'#f0c040', fontFamily:"'Cinzel',serif", fontWeight:700 }}>{p.prime} 🍖</span></div>
          <div style={{ fontSize:'.62rem', color:'#e03030', fontFamily:"'Cinzel',serif", letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'.4rem' }}>{CONDITION_PRIME_LABELS[p.condition_prime||'mort_ou_vif']}</div>
          {p.equipage && <div style={{ fontSize:'.82rem', color:'#7a9ab8', marginBottom:'.4rem' }}>⚓ {p.equipage}</div>}
          {p.fruit && p.fruit !== 'Aucun' && <div style={{ fontSize:'.82rem', color:'#7a9ab8' }}>🍎 {p.fruit}</div>}
          {linkedDespa && <div style={{ fontSize:'.82rem', color:'#7a9ab8' }}>🦾 {linkedDespa.nom}</div>}

          {/* Tags */}
          {p.tags && (
            <div style={{ display:'flex', gap:'.3rem', flexWrap:'wrap', marginTop:'.6rem' }}>
              {p.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{ background:'rgba(10,30,53,.8)', border:'1px solid rgba(30,120,200,.2)', borderRadius:4, padding:'.12rem .45rem', fontFamily:"'Cinzel',serif", fontSize:'.48rem', letterSpacing:'.05em', textTransform:'uppercase', color:'#4a6880' }}>{t}</span>
              ))}
            </div>
          )}

          {/* Links + actions */}
          <div style={{ display:'flex', gap:'.4rem', marginTop:'.75rem', flexWrap:'wrap', alignItems:'center' }}>
            {p.gdoc && <a href={p.gdoc} target="_blank" rel="noopener" style={{ background:'rgba(66,133,244,.12)', color:'#6aabff', border:'1px solid rgba(66,133,244,.25)', borderRadius:6, padding:'.18rem .5rem', fontFamily:"'Cinzel',serif", fontSize:'.48rem', textDecoration:'none' }}>📄 Doc</a>}
            {p.miro && <a href={p.miro} target="_blank" rel="noopener" style={{ background:'rgba(255,196,0,.1)', color:'#ffc400', border:'1px solid rgba(255,196,0,.25)', borderRadius:6, padding:'.18rem .5rem', fontFamily:"'Cinzel',serif", fontSize:'.48rem', textDecoration:'none' }}>🗒 Miro</a>}
            <div style={{ marginLeft:'auto', display:'flex', gap:'.3rem' }}>
              <button onClick={() => toggleFav(p)} style={{ background:'none', border:'1px solid rgba(30,120,200,.2)', borderRadius:'50%', width:28, height:28, color: p.fav?'#d4a017':'#4a6880', cursor:'pointer', fontSize:'.8rem' }}>{p.fav?'♥':'♡'}</button>
              <button onClick={() => duplicatePerso(p)} title="Dupliquer" style={{ background:'rgba(160,96,255,.1)', border:'1px solid rgba(160,96,255,.25)', borderRadius:8, padding:'.2rem .5rem', color:'#a060ff', cursor:'pointer', fontSize:'.7rem', fontFamily:"'Cinzel',serif" }}>⧉</button>
              <button onClick={() => openForm(p)} style={{ background:'rgba(0,200,255,.1)', border:'1px solid rgba(0,200,255,.25)', borderRadius:8, padding:'.2rem .5rem', color:'#00c8ff', cursor:'pointer', fontSize:'.7rem', fontFamily:"'Cinzel',serif" }}>✏️</button>
              <button onClick={() => deletePerso(p.id)} style={{ background:'rgba(224,48,48,.1)', border:'1px solid rgba(224,48,48,.25)', borderRadius:8, padding:'.2rem .5rem', color:'#ff6060', cursor:'pointer', fontSize:'.7rem', fontFamily:"'Cinzel',serif" }}>🗑</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus, select:focus { border-color: #d4a017 !important; box-shadow: 0 0 0 3px rgba(212,160,23,.15); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d4a017; border-radius: 3px; }
      `}</style>

      {/* NAV */}
      <nav style={S.nav}>
        <a href="/" style={S.logo}>
          <span style={{ width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>☠</span>
          Grand Line
        </a>
        <div style={{ flex:1, display:'flex', gap:'.3rem', overflowX:'auto', scrollbarWidth:'none' }}>
          {navLinks.map(([l,h]) => (
            <a key={h} href={h} style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.06em', textTransform:'uppercase', color: h==='/personnages'?'#f0c040':'#7a9ab8', textDecoration:'none', padding:'.38rem .6rem', borderRadius:6, whiteSpace:'nowrap', background: h==='/personnages'?'rgba(212,160,23,.15)':'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding:'.38rem .85rem', textDecoration:'none', fontSize:'.62rem' }}>⚓ MJ</a>
      </nav>

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.1em', color:'#7a9ab8', textTransform:'uppercase', marginBottom:'.4rem' }}>
          🏴‍☠️ › Personnages
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
          <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(1.8rem,3.5vw,3rem)', fontWeight:700, background:'linear-gradient(135deg,#fff,#f0c040)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Personnages
          </h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter un personnage</button>
        </div>

        {/* Search */}
        <div style={{ display:'flex', gap:'.65rem', marginBottom:'1rem', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:220, position:'relative' }}>
            <span style={{ position:'absolute', left:'.75rem', top:'50%', transform:'translateY(-50%)', color:'#4a6880' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft:'2.5rem' }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Tri */}
        <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', alignItems:'center', marginBottom:'.75rem' }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.56rem', letterSpacing:'.1em', textTransform:'uppercase', color:'#4a6880', marginRight:'.2rem' }}>Trier :</span>
          {([['defaut','Par défaut'],['prime','Par prime'],['groupe','Par groupe']] as [SortMode,string][]).map(([m,l]) => (
            <button key={m} onClick={() => setSortMode(m)} style={{ background: sortMode===m ? 'rgba(0,200,255,.15)' : '#0a1829', border: `1px solid ${sortMode===m ? '#00c8ff' : 'rgba(30,120,200,.2)'}`, borderRadius:100, padding:'.3rem .8rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.07em', textTransform:'uppercase', color: sortMode===m ? '#00c8ff' : '#7a9ab8', cursor:'pointer' }}>{l}</button>
          ))}
        </div>

        {/* Chips */}
        <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'.75rem' }}>
          {['', 'pj', 'pnj', 'antagoniste', 'allié', 'ambivalent'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter===t ? 'rgba(212,160,23,.15)' : '#0a1829', border: `1px solid ${typeFilter===t ? '#d4a017' : 'rgba(30,120,200,.2)'}`, borderRadius:100, padding:'.3rem .8rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.07em', textTransform:'uppercase', color: typeFilter===t ? '#f0c040' : '#7a9ab8', cursor:'pointer' }}>
              {t || 'Tous'}
            </button>
          ))}
        </div>

        {/* Filtre par faction */}
        {factions.length > 0 && (
          <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', alignItems:'center', marginBottom:'1.25rem' }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.56rem', letterSpacing:'.1em', textTransform:'uppercase', color:'#4a6880', marginRight:'.2rem' }}>Filtrer par faction :</span>
            <button onClick={() => setFactionFilter('')} style={{ background: factionFilter==='' ? 'rgba(212,160,23,.15)' : '#0a1829', border: `1px solid ${factionFilter==='' ? '#d4a017' : 'rgba(30,120,200,.2)'}`, borderRadius:100, padding:'.3rem .8rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.07em', textTransform:'uppercase', color: factionFilter==='' ? '#f0c040' : '#7a9ab8', cursor:'pointer' }}>Toutes</button>
            {factions.map(f => (
              <button key={f.id} onClick={() => setFactionFilter(f.nom)} style={{ background: factionFilter===f.nom ? 'rgba(212,160,23,.15)' : '#0a1829', border: `1px solid ${factionFilter===f.nom ? '#d4a017' : 'rgba(30,120,200,.2)'}`, borderRadius:100, padding:'.3rem .8rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.07em', textTransform:'uppercase', color: factionFilter===f.nom ? '#f0c040' : '#7a9ab8', cursor:'pointer' }}>{f.nom}</button>
            ))}
          </div>
        )}
      </div>

      {/* GRID */}
      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'5rem 2rem', color:'#4a6880' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:.4 }}>👤</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.72rem', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'1.5rem' }}>Aucun personnage</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter le premier</button>
          </div>
        )}
        {sortMode === 'groupe'
          ? buildGroupSections(filtered, factions).flatMap((section, si) => {
              const nodes: React.ReactNode[] = [
                <div key={`div-${section.faction || 'none'}`} style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'.75rem', margin: si===0 ? '0 0 .2rem' : '1.4rem 0 .2rem' }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:'.68rem', letterSpacing:'.12em', textTransform:'uppercase', color:'#f0c040' }}>
                    {section.members.some(p => p.titre_mondial === 'Empereur') && '👑 '}⚓ {section.faction || 'Sans groupe'}
                  </span>
                  <div style={{ flex:1, height:1, background:'rgba(212,160,23,.25)' }} />
                </div>
              ]
              section.members.forEach(p => nodes.push(renderCard(p, `${section.faction || 'none'}-${p.id}`)))
              return nodes
            })
          : sortPersonnages(filtered, sortMode).map(p => renderCard(p, p.id))}
      </div>

      {/* ===== FORM MODAL ===== */}
      {showForm && (
        <div style={S.overlay} onClick={e => { if(e.target===e.currentTarget)setShowForm(false) }}>
          <div style={S.modal}>
            <div style={{ padding:'1.35rem 1.75rem', borderBottom:'1px solid rgba(30,120,200,.2)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#0a1829', borderRadius:'18px 18px 0 0', zIndex:5 }}>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'1.15rem', color:'#f0c040' }}>
                {editId ? '✏️ Modifier' : '✚ Nouveau Personnage'}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background:'rgba(5,13,26,.75)', border:'1px solid rgba(30,120,200,.2)', color:'#7a9ab8', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'.9rem' }}>✕</button>
            </div>

            <div style={{ padding:'1.75rem', display:'flex', flexDirection:'column', gap:'1.1rem' }}>

              {/* PHOTOS */}
              <div>
                <label style={S.label}>📸 Photos du personnage</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'.6rem', marginBottom:'.65rem' }}>
                  {(form.photos || []).map((src, i) => (
                    <div key={`existing-${i}`} style={{ aspectRatio:'1', borderRadius:8, overflow:'hidden', position:'relative', border: i===0?'2px solid #d4a017':'2px solid rgba(30,120,200,.2)' }}>
                      <img src={src} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', opacity: cropLoading===i?.4:1 }} />
                      {cropLoading===i && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>⏳</div>}
                      <button onClick={() => cropExistingPhoto(i)} title="Recadrer"
                        style={{ position:'absolute', top:2, left:2, background:'rgba(0,200,255,.85)', border:'none', borderRadius:'50%', width:20, height:20, color:'#050d1a', fontSize:'.6rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✂️</button>
                      <button onClick={() => removeExistingPhoto(i)}
                        style={{ position:'absolute', top:2, right:2, background:'rgba(224,48,48,.85)', border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', fontSize:'.6rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      {i===0 && <div style={{ position:'absolute', bottom:2, left:2, background:'rgba(212,160,23,.85)', borderRadius:4, fontFamily:"'Cinzel',serif", fontSize:'.45rem', color:'#050d1a', padding:'1px 4px' }}>Principal</div>}
                    </div>
                  ))}
                  {photoPreviews.map((src, i) => (
                    <div key={`new-${i}`} style={{ aspectRatio:'1', borderRadius:8, overflow:'hidden', position:'relative', border: ((form.photos||[]).length===0 && i===0) ? '2px solid #d4a017' : '2px solid rgba(30,120,200,.2)' }}>
                      <img src={src} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <button onClick={() => setCropTarget({ kind:'new', index:i, file:photoFiles[i] })} title="Recadrer"
                        style={{ position:'absolute', top:2, left:2, background:'rgba(0,200,255,.85)', border:'none', borderRadius:'50%', width:20, height:20, color:'#050d1a', fontSize:'.6rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✂️</button>
                      <button onClick={() => removeNewPhoto(i)}
                        style={{ position:'absolute', top:2, right:2, background:'rgba(224,48,48,.85)', border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', fontSize:'.6rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      {(form.photos||[]).length===0 && i===0 && <div style={{ position:'absolute', bottom:2, left:2, background:'rgba(212,160,23,.85)', borderRadius:4, fontFamily:"'Cinzel',serif", fontSize:'.45rem', color:'#050d1a', padding:'1px 4px' }}>Principal</div>}
                    </div>
                  ))}
                  {((form.photos||[]).length + photoPreviews.length) < 8 && (
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); addPhotoFiles(Array.from(e.dataTransfer.files || [])) }}
                      style={{ aspectRatio:'1', borderRadius:8, border: dragOver ? '2px dashed #d4a017' : '2px dashed rgba(30,120,200,.3)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background: dragOver ? 'rgba(212,160,23,.1)' : '#0d2040', color:'#4a6880', fontSize:'.6rem', fontFamily:"'Cinzel',serif", gap:'.3rem', textAlign:'center' }}>
                      <input type="file" accept="image/*,.gif" multiple style={{ display:'none' }} onChange={handlePhotoChange} />
                      <span style={{ fontSize:'1.5rem' }}>➕</span>
                      <span>Clique ou glisse</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Nom + Surnom */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Nom complet *</label>
                  <input style={S.input} value={form.nom||''} onChange={e => setForm(f => ({...f, nom:e.target.value}))} placeholder="Kira D. Storm" />
                </div>
                <div>
                  <label style={S.label}>Surnom</label>
                  <input style={S.input} value={form.surnom||''} onChange={e => setForm(f => ({...f, surnom:e.target.value}))} placeholder="L'Œil du Typhon" />
                </div>
              </div>

              {/* Type + Statut */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Type</label>
                  <select style={{ ...S.input }} value={form.type||'pnj'} onChange={e => setForm(f => ({...f, type:e.target.value}))}>
                    <option value="pj">PJ — Joueur</option>
                    <option value="pnj">PNJ</option>
                    <option value="antagoniste">Antagoniste</option>
                    <option value="allié">Allié</option>
                    <option value="ambivalent">Ambivalent</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Statut</label>
                  <select style={{ ...S.input }} value={form.statut||'vivant'} onChange={e => setForm(f => ({...f, statut:e.target.value}))}>
                    <option value="vivant">Vivant</option>
                    <option value="mort">Mort</option>
                    <option value="disparu">Disparu</option>
                    <option value="inconnu">Inconnu</option>
                  </select>
                </div>
              </div>

              {/* Prime + Condition */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Prime (beris)</label>
                  <input style={S.input} value={form.prime||''} onChange={e => setForm(f => ({...f, prime:e.target.value}))} placeholder="450,000,000" />
                </div>
                <div>
                  <label style={S.label}>Avis de recherche</label>
                  <select style={{ ...S.input }} value={form.condition_prime||'mort_ou_vif'} onChange={e => setForm(f => ({...f, condition_prime:e.target.value}))}>
                    <option value="mort_ou_vif">Mort ou Vif</option>
                    <option value="mort_uniquement">Mort uniquement</option>
                    <option value="vif_uniquement">Vif uniquement</option>
                    <option value="non_recherche">Non recherché</option>
                  </select>
                </div>
              </div>

              {/* Origine + Titre mondial */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Origine</label>
                  <input style={S.input} value={form.origine||''} onChange={e => setForm(f => ({...f, origine:e.target.value}))} placeholder="East Blue" />
                </div>
                <div>
                  <label style={S.label}>👑 Titre mondial</label>
                  <select style={{ ...S.input }} value={form.titre_mondial||''} onChange={e => setForm(f => ({...f, titre_mondial:e.target.value}))}>
                    <option value="">— Aucun —</option>
                    <option value="Empereur">👑 Empereur (Yonko)</option>
                    <option value="Amiral">⚓ Amiral</option>
                    <option value="Vice-Amiral">🎖️ Vice-Amiral</option>
                  </select>
                </div>
              </div>

              {/* Île Natale */}
              <div>
                <label style={S.label}>🏝️ Île Natale</label>
                <select style={{ ...S.input }} value={form.ile || ''} onChange={e => {
                  const nom = e.target.value
                  const chosen = iles.find(i => i.nom === nom)
                  setForm(f => ({ ...f, ile: nom, origine: chosen?.region || f.origine }))
                }}>
                  <option value="">— Aucune —</option>
                  {iles.map(i => <option key={i.id} value={i.nom}>{i.nom}</option>)}
                </select>
              </div>

              {/* Factions liées (multi) */}
              <div>
                <label style={S.label}>🏴‍☠️ Factions liées</label>
                {factions.length === 0 && <div style={{ fontSize:'.8rem', color:'#4a6880', fontStyle:'italic' }}>Aucune faction créée pour l&apos;instant.</div>}
                <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap' }}>
                  {factions.map(fac => {
                    const active = (form.factions || []).includes(fac.nom)
                    return (
                      <button key={fac.id} type="button" onClick={() => setForm(f => {
                        const current = f.factions || []
                        const nextFactions = active ? current.filter(n => n !== fac.nom) : [...current, fac.nom]
                        // On retire les rangs des factions qui ne sont plus sélectionnées
                        const nextRangs = (f.rangs || []).filter(r => nextFactions.includes(r.faction))
                        return { ...f, factions: nextFactions, rangs: nextRangs }
                      })} style={{ background: active ? 'rgba(212,160,23,.15)' : '#0a1829', border: `1px solid ${active ? '#d4a017' : 'rgba(30,120,200,.2)'}`, borderRadius:100, padding:'.35rem .8rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', color: active ? '#f0c040' : '#7a9ab8', cursor:'pointer' }}>
                        {active ? '✓ ' : ''}{fac.nom}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rangs dans les factions sélectionnées (un par faction) */}
              {(() => {
                const selectedFactions = factions.filter(f => (form.factions || []).includes(f.nom))
                if (selectedFactions.length === 0) return null
                return (
                  <div>
                    <label style={S.label}>🎖️ Rangs (un par faction possible)</label>
                    <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                      {selectedFactions.map(fac => {
                        const rangOptions = (fac.rangs || []).slice().sort((a,b) => a.ordre - b.ordre)
                        const current = (form.rangs || []).find(r => r.faction === fac.nom)?.rang || ''
                        return (
                          <div key={fac.id} style={{ display:'grid', gridTemplateColumns:'150px 1fr', gap:'.6rem', alignItems:'center' }}>
                            <span style={{ fontSize:'.78rem', color:'#7a9ab8' }}>{fac.nom}</span>
                            {rangOptions.length > 0 ? (
                              <select style={{ ...S.input }} value={current} onChange={e => {
                                const val = e.target.value
                                setForm(f => {
                                  const others = (f.rangs || []).filter(r => r.faction !== fac.nom)
                                  return { ...f, rangs: val ? [...others, { faction: fac.nom, rang: val }] : others }
                                })
                              }}>
                                <option value="">— Aucun —</option>
                                {rangOptions.map(r => <option key={r.nom} value={r.nom}>{r.nom}</option>)}
                              </select>
                            ) : (
                              <div style={{ fontSize:'.76rem', color:'#4a6880', fontStyle:'italic' }}>Aucun rang défini (Factions → Gérer les rangs)</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Equipage + Fruit */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Équipage</label>
                  <select style={{ ...S.input }} value={form.equipage || ''} onChange={e => setForm(f => ({...f, equipage:e.target.value}))}>
                    <option value="">— Aucun —</option>
                    {factions.map(fac => <option key={fac.id} value={fac.nom}>{fac.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Fruit du Démon</label>
                  <select style={{ ...S.input }} value={form.fruit || 'Aucun'} onChange={e => setForm(f => ({...f, fruit:e.target.value}))}>
                    <option value="Aucun">Aucun</option>
                    {FRUIT_TYPE_ORDER.map(type => {
                      const inType = fruits.filter(fr => fr.type === type).sort((a,b) => a.nom.localeCompare(b.nom))
                      if (inType.length === 0) return null
                      return (
                        <optgroup key={type} label={type}>
                          {inType.map(fr => <option key={fr.id} value={fr.nom}>{fr.nom}</option>)}
                        </optgroup>
                      )
                    })}
                    {(() => {
                      const other = fruits.filter(fr => !FRUIT_TYPE_ORDER.includes(fr.type || '')).sort((a,b) => a.nom.localeCompare(b.nom))
                      if (other.length === 0) return null
                      return (
                        <optgroup label="Autre">
                          {other.map(fr => <option key={fr.id} value={fr.nom}>{fr.nom}</option>)}
                        </optgroup>
                      )
                    })()}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={S.label}>Description</label>
                <textarea style={{ ...S.input, minHeight:90, resize:'vertical', lineHeight:1.7 }} value={form.description||''} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Description du personnage..." />
              </div>

              {/* Historique */}
              <div>
                <label style={S.label}>Historique</label>
                <textarea style={{ ...S.input, minHeight:90, resize:'vertical', lineHeight:1.7 }} value={form.historique||''} onChange={e => setForm(f => ({...f, historique:e.target.value}))} placeholder="Passé, événements importants..." />
              </div>

              {/* Techniques */}
              <div>
                <label style={S.label}>Techniques (une par ligne)</label>
                <textarea style={{ ...S.input, minHeight:80, resize:'vertical', lineHeight:1.7 }} value={form.techniques||''} onChange={e => setForm(f => ({...f, techniques:e.target.value}))} placeholder={"Tempête Céleste (Tenpuu Ransen) — Tornade dévastatrice\nLame des Vents (Kaze no Ha) — Lames d'air comprimé"} />
              </div>

              {/* Liens externes */}
              <div style={{ background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10, padding:'1.1rem' }}>
                <div style={{ ...S.label, marginBottom:'.75rem' }}>🔗 Liens Externes</div>
                <div style={{ marginBottom:'.65rem' }}>
                  <label style={{ ...S.label, color:'#7a9ab8' }}>📄 Google Doc URL</label>
                  <input style={S.input} value={form.gdoc||''} onChange={e => setForm(f => ({...f, gdoc:e.target.value}))} placeholder="https://docs.google.com/..." />
                </div>
                <div>
                  <label style={{ ...S.label, color:'#7a9ab8' }}>🗒 Miro Board URL</label>
                  <input style={S.input} value={form.miro||''} onChange={e => setForm(f => ({...f, miro:e.target.value}))} placeholder="https://miro.com/app/board/..." />
                </div>
              </div>

              {/* Tags + Emoji */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'.85rem' }}>
                <div>
                  <label style={S.label}>Tags (séparés par virgules)</label>
                  <input style={S.input} value={form.tags||''} onChange={e => setForm(f => ({...f, tags:e.target.value}))} placeholder="capitaine, logia, nord" />
                </div>
                <div>
                  <label style={S.label}>Emoji</label>
                  <input style={{ ...S.input, width:80, fontSize:'1.4rem', textAlign:'center' }} value={form.emoji||'👤'} onChange={e => setForm(f => ({...f, emoji:e.target.value}))} />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding:'1.1rem 1.75rem', borderTop:'1px solid rgba(30,120,200,.2)', display:'flex', gap:'.65rem', justifyContent:'flex-end', position:'sticky', bottom:0, background:'#0a1829', borderRadius:'0 0 18px 18px' }}>
              <button style={S.btnCyan} onClick={() => setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm} disabled={uploading}>
                {uploading ? '⏳ Upload...' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW MODAL ===== */}
      {showView && selected && (
        <div style={S.overlay} onClick={e => { if(e.target===e.currentTarget)setShowView(false) }}>
          <div style={{ ...S.modal, maxWidth:900 }}>
            {/* Header avec photo */}
            <div style={{ position:'relative', height:280, background:'linear-gradient(135deg,#071828,#0d2440)', borderRadius:'18px 18px 0 0', overflow:'hidden', display:'flex', alignItems:'flex-end', padding:'1.75rem' }}>
              {selected.photos && selected.photos[0] && (
                <img src={selected.photos[0]} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', opacity:.42, display:'block', filter: selected.statut==='mort' ? 'grayscale(1)' : 'none' }} />
              )}
              {(!selected.photos || !selected.photos[0]) && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13rem', opacity:.07, filter:'blur(2px)' }}>{selected.emoji}</div>
              )}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:150, background:'linear-gradient(to top,#0a1829,transparent)' }} />
              {selected.titre_mondial && TITRE_MONDIAL[selected.titre_mondial] && (
                <div style={{ position:'absolute', top:'.9rem', left:'.9rem', zIndex:5, background:`${TITRE_MONDIAL[selected.titre_mondial].color}dd`, color:'#050d1a', borderRadius:100, padding:'.3rem .75rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>
                  {TITRE_MONDIAL[selected.titre_mondial].icon} {TITRE_MONDIAL[selected.titre_mondial].label}
                </div>
              )}
              <button onClick={() => setShowView(false)} style={{ position:'absolute', top:'.9rem', right:'.9rem', background:'rgba(5,13,26,.75)', border:'1px solid rgba(30,120,200,.2)', color:'#7a9ab8', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'.9rem', zIndex:5 }}>✕</button>
              <div style={{ position:'relative', zIndex:2, display:'flex', gap:'1.25rem', alignItems:'flex-end' }}>
                <div style={{ width:86, height:86, borderRadius:14, background:'#0d2040', border:'2px solid #d4a017', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.8rem' }}>
                  {selected.photos && selected.photos[0] ? <img src={selected.photos[0]} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top', display:'block', filter: selected.statut==='mort' ? 'grayscale(1)' : 'none' }} /> : selected.emoji}
                </div>
                <div>
                  <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'1.85rem', fontWeight:700, color:'#fff', textDecoration: selected.statut==='mort' ? 'line-through' : 'none', marginBottom:'.15rem' }}>{selected.statut==='mort' && '☠️ '}{selected.nom}</div>
                  {selected.surnom && <div style={{ fontStyle:'italic', color:'#f0c040', fontSize:'.95rem', marginBottom:'.45rem' }}>"{selected.surnom}"</div>}
                  <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap' }}>
                    <span style={{ background:`${TYPE_COLORS[selected.type]}22`, color:TYPE_COLORS[selected.type], border:`1px solid ${TYPE_COLORS[selected.type]}44`, borderRadius:100, padding:'.15rem .65rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.1em', textTransform:'uppercase' }}>{selected.type.toUpperCase()}</span>
                    {selected.fruit && selected.fruit !== 'Aucun' && <span style={{ background:'rgba(212,160,23,.18)', color:'#f0c040', border:'1px solid rgba(212,160,23,.3)', borderRadius:100, padding:'.15rem .65rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.1em', textTransform:'uppercase' }}>🍎 {selected.fruit}</span>}
                    {personnageRangs(selected).map(r => (
                      <span key={r.faction} style={{ background:'rgba(160,96,255,.18)', color:'#a060ff', border:'1px solid rgba(160,96,255,.3)', borderRadius:100, padding:'.15rem .65rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.1em', textTransform:'uppercase' }}>
                        🎖️ {r.rang}{personnageRangs(selected).length > 1 && r.faction && ` (${r.faction})`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:'1.75rem' }}>
              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.1rem', marginBottom:'1.25rem' }}>
                {[
                  { l:'⭐ Prime', v:selected.prime+' 🍖', c:'#f0c040', href:null },
                  { l:'📋 Avis de recherche', v:CONDITION_PRIME_LABELS[selected.condition_prime||'mort_ou_vif'], c:'#e03030', href:null },
                  { l:'⚓ Équipage', v:selected.equipage||'—', c:'#00c8ff', href:null },
                  { l:'📍 Origine', v:selected.origine||'—', c:'#7a9ab8', href:null },
                  { l:'🏝️ Île', v:selected.ile||'—', c:'#40d060', href: selected.ile ? `/iles?q=${encodeURIComponent(selected.ile)}` : null },
                  { l:'🏴‍☠️ Factions', v:(selected.factions && selected.factions.length > 0) ? selected.factions.join(', ') : '—', c:'#ff8c40', href: null },
                  { l:'🦾 Despa', v: despas.find(d => d.proprietaire === selected.nom)?.nom || '—', c:'#4488ff', href: despas.find(d => d.proprietaire === selected.nom) ? `/despas?q=${encodeURIComponent(despas.find(d => d.proprietaire === selected.nom)!.nom)}` : null },
                  { l:'❤️ Statut', v:selected.statut||'—', c:STATUT_COLORS[selected.statut||''] , href:null},
                ].map(({l,v,c,href}) => {
                  const tile = (
                    <div style={{ background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10, padding:'1rem', cursor: href?'pointer':'default', transition:'border-color .2s' }}>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#4a6880', marginBottom:'.35rem' }}>{l}</div>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:'1.1rem', fontWeight:700, color:c }}>{v}</div>
                    </div>
                  )
                  return href ? <a key={l} href={href} style={{ textDecoration:'none' }}>{tile}</a> : <div key={l}>{tile}</div>
                })}
              </div>

              {/* Galerie photos */}
              {selected.photos && selected.photos.length > 1 && (
                <>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
                    📸 Galerie ({selected.photos.length} photos)
                    <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} />
                  </div>
                  <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
                    {selected.photos.map((ph,i) => (
                      <div key={i} style={{ width:70, height:70, borderRadius:8, overflow:'hidden', border:`2px solid ${i===0?'#d4a017':'rgba(30,120,200,.2)'}` }}>
                        <img src={ph} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Liens */}
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
                🔗 Liens Externes <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} />
              </div>
              <div style={{ display:'flex', gap:'.65rem', flexWrap:'wrap', marginBottom:'1.25rem', padding:'1rem', background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10 }}>
                {selected.gdoc ? <a href={selected.gdoc} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:'.45rem', borderRadius:9, padding:'.55rem .95rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', textDecoration:'none', background:'rgba(66,133,244,.15)', color:'#6aabff', border:'1px solid rgba(66,133,244,.3)' }}>📄 Ouvrir le Google Doc</a> : <span style={{ color:'#4a6880', fontStyle:'italic', fontSize:'.88rem' }}>Pas de Google Doc</span>}
                {selected.miro && <a href={selected.miro} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:'.45rem', borderRadius:9, padding:'.55rem .95rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', textDecoration:'none', background:'rgba(255,196,0,.12)', color:'#ffc400', border:'1px solid rgba(255,196,0,.3)' }}>🗒 Ouvrir le Miro Board</a>}
              </div>

              {/* Description */}
              {selected.description && <>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>📖 Description <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} /></div>
                <p style={{ fontSize:'1rem', color:'#7a9ab8', lineHeight:1.8, marginBottom:'1.25rem', fontStyle:'italic' }}>{selected.description}</p>
              </>}

              {/* Techniques */}
              {selected.techniques && <>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>⚔️ Techniques <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} /></div>
                {selected.techniques.split('\n').filter(Boolean).map((t,i) => {
                  const [title,...rest] = t.split('—')
                  const jp = title.match(/\(([^)]+)\)/)
                  const cleanTitle = title.replace(/\([^)]+\)/,'').trim()
                  return <div key={i} style={{ background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderLeft:'3px solid #d4a017', borderRadius:8, padding:'.9rem 1rem', marginBottom:'.6rem' }}>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.85rem', fontWeight:700, color:'#e8eef5', marginBottom:'.2rem' }}>{cleanTitle} {jp && <span style={{ color:'#4a6880', fontWeight:400, fontSize:'.75rem', fontStyle:'italic' }}>({jp[1]})</span>}</div>
                    {rest.length > 0 && <div style={{ fontSize:'.85rem', color:'#7a9ab8', fontStyle:'italic' }}>{rest.join('—').trim()}</div>}
                  </div>
                })}
              </>}

              {/* Historique */}
              {selected.historique && <>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>📜 Historique <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} /></div>
                <p style={{ fontSize:'1rem', color:'#7a9ab8', lineHeight:1.8, marginBottom:'1.25rem', fontStyle:'italic' }}>{selected.historique}</p>
              </>}

              {/* Fiches liées */}
              {(() => {
                const linkedFruits = fruits.filter(fr => fr.proprietaire === selected.nom)
                const linkedDespas = despas.filter(d => d.proprietaire === selected.nom)
                const linkedLames = lames.filter(l => l.proprietaire === selected.nom)
                const linkedCristaux = cristaux.filter(c => c.proprietaire === selected.nom)
                const chips: { icon: string; label: string; href: string }[] = []
                if (selected.fruit && selected.fruit !== 'Aucun' && !linkedFruits.some(fr => fr.nom === selected.fruit)) {
                  chips.push({ icon:'🍎', label: selected.fruit, href:`/fruits?q=${encodeURIComponent(selected.fruit)}` })
                }
                linkedFruits.forEach(fr => chips.push({ icon:'🍎', label: fr.nom, href:`/fruits?q=${encodeURIComponent(fr.nom)}` }))
                linkedDespas.forEach(d => chips.push({ icon:'🦾', label: d.nom, href:`/despas?q=${encodeURIComponent(d.nom)}` }))
                linkedLames.forEach(l => chips.push({ icon:'⚔️', label: l.nom, href:`/lames?q=${encodeURIComponent(l.nom)}` }))
                linkedCristaux.forEach(c => chips.push({ icon:'💎', label: c.nom, href:`/cristaux?q=${encodeURIComponent(c.nom)}` }))
                if (selected.ile) chips.push({ icon:'🏝️', label: selected.ile, href:`/iles?q=${encodeURIComponent(selected.ile)}` })
                ;(selected.factions || []).forEach(fn => chips.push({ icon:'🏴‍☠️', label: fn, href:`/factions?q=${encodeURIComponent(fn)}` }))
                if (chips.length === 0) return null
                return (
                  <>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.65rem', display:'flex', alignItems:'center', gap:'.5rem' }}>🔗 Fiches liées <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} /></div>
                    <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
                      {chips.map((c,i) => (
                        <a key={i} href={c.href} style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:100, padding:'.4rem .85rem', color:'#c8d8e8', textDecoration:'none', fontSize:'.82rem' }}>
                          <span>{c.icon}</span>{c.label}
                        </a>
                      ))}
                    </div>
                  </>
                )
              })()}

              {/* Actions */}
              <div style={{ display:'flex', gap:'.65rem', justifyContent:'flex-end', marginTop:'1.25rem', paddingTop:'1.1rem', borderTop:'1px solid rgba(30,120,200,.2)' }}>
                <button style={{ background:'rgba(224,48,48,.12)', color:'#ff6060', border:'1px solid rgba(224,48,48,.3)', borderRadius:8, padding:'.45rem .9rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', cursor:'pointer' }} onClick={() => deletePerso(selected.id)}>🗑 Supprimer</button>
                <button style={{ background:'rgba(0,200,255,.12)', color:'#00c8ff', border:'1px solid rgba(0,200,255,.3)', borderRadius:8, padding:'.45rem .9rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', cursor:'pointer' }} onClick={() => { setShowView(false); openForm(selected) }}>✏️ Modifier</button>
                <button style={{ background:'linear-gradient(135deg,#d4a017,#b8860b)', color:'#050d1a', border:'none', borderRadius:8, padding:'.45rem .9rem', fontFamily:"'Cinzel',serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.07em', cursor:'pointer' }} onClick={() => toggleFav(selected)}>
                  {selected.fav ? '♥ Favoris' : '♡ Favoris'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cropTarget && <ImageCropper file={cropTarget.file} onCancel={() => setCropTarget(null)} onCropped={onCropDone} />}
    </div>
  )
}
