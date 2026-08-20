'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import { fetchCategoryValues } from '@/lib/categories'
import GlobalSearch from '@/components/GlobalSearch'
import ImageLightbox from '@/components/ImageLightbox'

interface Pds {
  id: string
  nom: string
  code?: string
  type?: string
  classe?: string
  statut?: string
  hereditaire?: boolean
  emoji?: string
  color?: string
  photos?: string[]
  pouvoir?: string
  faiblesse?: string
  objectif_etude?: string
  despas_derives?: string[]
  sujet_nom?: string
  sujet_statut?: string
  sujet_photos?: string[]
  sujet_biographie?: string
  sujet_notes?: string
}

const THEME = '#40d060'
const FALLBACK_TYPES = ['Résonance', 'Mutationnel', 'Bestial', 'Héritage']
const FALLBACK_CLASSES = ['C', 'B', 'A', 'S', 'SS']
const FALLBACK_STATUTS = ['Actif', 'Perdu', 'En Stase', 'En fuite', 'Neutralisé', 'Inconnu']
// Du plus faible au plus fort — sert à trier par niveau, SS (le plus fort) en tête.
function classeRank(c: string | undefined, classes: string[]) { const i = classes.indexOf(c || ''); return i === -1 ? -1 : i }
const EXPLAINER = "Un PDS est un être vivant — humain, animal ou créature — porteur d'une anomalie naturelle, génétique ou énergétique. On ne le fabrique pas, on l'observe et on l'étudie, parfois pour en tirer un Despa. Remplis cette fiche pour documenter le sujet : son pouvoir, ses limites, et son histoire."

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  header: { padding: '2.5rem 2rem 1.5rem', maxWidth: 1400, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem', padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' },
  btnGold: { background: `linear-gradient(135deg, ${THEME}, #2ca050)`, color: '#050d1a', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: `1px solid ${THEME}66`, borderRadius: 18, maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

const navLinks = [['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'], ['DS', '/despa'], ['PDS', '/pds'], ['Lames', '/lames'], ['Cristaux', '/cristaux'], ['Îles', '/iles'], ['Factions', '/factions'], ['Journaux', '/journaux'], ['Lore', '/lore'], ['Dashboard', '/dashboard']]

function emptyForm(): Partial<Pds> {
  return {
    nom: '', code: '', type: 'Résonance', classe: 'C', statut: 'Actif', hereditaire: false, emoji: '', color: THEME,
    photos: [], pouvoir: '', faiblesse: '', objectif_etude: '', despas_derives: [],
    sujet_nom: '', sujet_statut: '', sujet_photos: [], sujet_biographie: '', sujet_notes: '',
  }
}

// Galerie multi-image réutilisée pour les photos du PDS et, séparément, pour celles du sujet —
// déclarée hors du composant de page pour ne pas être recréée à chaque rendu.
function PhotoGrid({ photos, previews, onRemoveExisting, onRemoveNew, onAdd, dragOver, setDragOver, openLightbox }: {
  photos: string[]; previews: string[]
  onRemoveExisting: (i: number) => void; onRemoveNew: (i: number) => void; onAdd: (files: File[]) => void
  dragOver: boolean; setDragOver: (v: boolean) => void
  openLightbox: (i: number) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.6rem' }}>
      {photos.map((src, i) => (
        <div key={`existing-${i}`} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', border: i === 0 ? `2px solid ${THEME}` : '2px solid rgba(30,120,200,.2)', cursor: 'zoom-in' }}
          onClick={() => openLightbox(i)}>
          <img loading="lazy" src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button onClick={e => { e.stopPropagation(); onRemoveExisting(i) }}
            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(224,48,48,.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: '.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          {i === 0 && <div style={{ position: 'absolute', bottom: 2, left: 2, background: `${THEME}dd`, borderRadius: 4, fontFamily: "'Cinzel',serif", fontSize: '.45rem', color: '#050d1a', padding: '1px 4px' }}>Couverture</div>}
        </div>
      ))}
      {previews.map((src, i) => (
        <div key={`new-${i}`} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', border: (photos.length === 0 && i === 0) ? `2px solid ${THEME}` : '2px solid rgba(30,120,200,.2)' }}>
          <img loading="lazy" src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button onClick={() => onRemoveNew(i)}
            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(224,48,48,.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: '.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      ))}
      {(photos.length + previews.length) < 8 && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); onAdd(Array.from(e.dataTransfer.files || [])) }}
          style={{ aspectRatio: '1', borderRadius: 8, border: dragOver ? `2px dashed ${THEME}` : '2px dashed rgba(30,120,200,.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: dragOver ? `${THEME}1a` : '#0d2040', color: '#4a6880', fontSize: '.6rem', fontFamily: "'Cinzel',serif", gap: '.3rem', textAlign: 'center' }}>
          <input type="file" accept="image/*,.gif" multiple style={{ display: 'none' }} onChange={e => { onAdd(Array.from(e.target.files || [])); e.target.value = '' }} />
          <span style={{ fontSize: '1.5rem' }}>➕</span>
          <span>Clique ou glisse</span>
        </label>
      )}
    </div>
  )
}

export default function PdsPage() {
  const [list, setList] = useState<Pds[]>([])
  const [filtered, setFiltered] = useState<Pds[]>([])
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [despasList, setDespasList] = useState<{ id: string; nom: string }[]>([])
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [form, setForm] = useState<Partial<Pds>>(emptyForm())

  // Photos du PDS lui-même
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [dragOverPds, setDragOverPds] = useState(false)
  // Photos du sujet — galerie séparée
  const [sujetPhotoFiles, setSujetPhotoFiles] = useState<File[]>([])
  const [sujetPhotoPreviews, setSujetPhotoPreviews] = useState<string[]>([])
  const [dragOverSujet, setDragOverSujet] = useState(false)
  const [types, setTypes] = useState(FALLBACK_TYPES)
  const [classes, setClasses] = useState(FALLBACK_CLASSES)
  const [statuts, setStatuts] = useState(FALLBACK_STATUTS)

  const despasMap = new Map(despasList.map(d => [d.nom, d.id]))

  useEffect(() => {
    fetchList(); fetchDespas(); fetchTaxonomies()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])
  useEffect(() => {
    let l = list
    if (search) l = l.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()))
    if (statutFilter) l = l.filter(p => p.statut === statutFilter)
    l = l.slice().sort((a, b) => classeRank(b.classe, classes) - classeRank(a.classe, classes))
    setFiltered(l)
  }, [list, search, statutFilter, classes])

  async function fetchTaxonomies() {
    const [t, c, s] = await Promise.all([
      fetchCategoryValues('pds', 'type', FALLBACK_TYPES),
      fetchCategoryValues('pds', 'classe', FALLBACK_CLASSES),
      fetchCategoryValues('pds', 'statut', FALLBACK_STATUTS),
    ])
    setTypes(t); setClasses(c); setStatuts(s)
  }

  async function fetchList() {
    const { data } = await supabase.from('pds').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchDespas() {
    const { data } = await supabase.from('despas').select('id, nom').order('nom', { ascending: true })
    setDespasList(data || [])
  }

  function openForm(p?: Pds) {
    if (p) { setForm({ ...emptyForm(), ...p }); setEditId(p.id) }
    else { setForm(emptyForm()); setEditId(null) }
    setPhotoFiles([]); setPhotoPreviews([])
    setSujetPhotoFiles([]); setSujetPhotoPreviews([])
    setShowForm(true)
  }

  function addPdsPhotos(files: File[]) {
    const imgFiles = files.filter(f => f.type.startsWith('image/'))
    setPhotoFiles(prev => [...prev, ...imgFiles])
    setPhotoPreviews(prev => [...prev, ...imgFiles.map(f => URL.createObjectURL(f))])
  }
  function addSujetPhotos(files: File[]) {
    const imgFiles = files.filter(f => f.type.startsWith('image/'))
    setSujetPhotoFiles(prev => [...prev, ...imgFiles])
    setSujetPhotoPreviews(prev => [...prev, ...imgFiles.map(f => URL.createObjectURL(f))])
  }

  async function saveForm() {
    if (!form.nom?.trim()) { alert('Le nom est obligatoire !'); return }
    setUploading(true)
    let photos = form.photos || []
    for (const file of photoFiles) {
      const url = await uploadImage(file, 'pds')
      if (url) photos = [...photos, url]
    }
    let sujetPhotos = form.sujet_photos || []
    for (const file of sujetPhotoFiles) {
      const url = await uploadImage(file, 'pds-sujets')
      if (url) sujetPhotos = [...sujetPhotos, url]
    }
    const data = { ...form, photos, sujet_photos: sujetPhotos }
    const { error } = editId
      ? await supabase.from('pds').update(data).eq('id', editId)
      : await supabase.from('pds').insert([data])
    setUploading(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    setShowForm(false)
    fetchList()
  }

  async function deletePds(id: string) {
    if (!confirm('Supprimer ce PDS ?')) return
    await supabase.from('pds').delete().eq('id', id)
    fetchList()
  }

  async function duplicatePds(p: Pds) {
    const { id, ...rest } = p
    void id
    await supabase.from('pds').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
    fetchList()
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus, select:focus { border-color: ${THEME} !important; box-shadow: 0 0 0 3px ${THEME}26; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: ${THEME}; border-radius: 3px; }
      `}</style>

      <nav style={S.nav}>
        <a href="/" style={S.logo}>
          <span style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#d4a017,#f0c040)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☠</span>
          Grand Line
        </a>
        <div style={{ flex: 1, display: 'flex', gap: '.3rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {navLinks.map(([l, h]) => (
            <a key={h} href={h} style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: h === '/pds' ? THEME : '#7a9ab8', textDecoration: 'none', padding: '.38rem .6rem', borderRadius: 6, whiteSpace: 'nowrap', background: h === '/pds' ? `${THEME}26` : 'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding: '.38rem .85rem', textDecoration: 'none', fontSize: '.62rem' }}>⚓ MJ</a>
      </nav>

      <div style={S.header}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.1em', color: '#7a9ab8', textTransform: 'uppercase', marginBottom: '.4rem' }}>🏴‍☠️ › PDS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 700, backgroundImage: `linear-gradient(135deg,#fff,${THEME})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>PDS</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Nouveau PDS</button>
        </div>

        {/* Bandeau explicatif — toujours visible, jamais un tooltip */}
        <div style={{ background: `${THEME}18`, border: `1px solid ${THEME}44`, borderLeft: `4px solid ${THEME}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '.88rem', color: '#c8d8e8', lineHeight: 1.6 }}>
          {EXPLAINER}
        </div>

        <div style={{ display: 'flex', gap: '.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: '#4a6880' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft: '2.5rem' }} placeholder="Rechercher un PDS..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '.5rem' }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', color: '#4a6880', marginRight: '.2rem' }}>Statut :</span>
          <button onClick={() => setStatutFilter('')} style={{ background: statutFilter === '' ? `${THEME}30` : '#0a1829', border: `1px solid ${statutFilter === '' ? THEME : 'rgba(30,120,200,.2)'}`, borderRadius: 100, padding: '.3rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: statutFilter === '' ? THEME : '#7a9ab8', cursor: 'pointer' }}>Tous</button>
          {statuts.map(s => (
            <button key={s} onClick={() => setStatutFilter(s)} style={{ background: statutFilter === s ? `${THEME}30` : '#0a1829', border: `1px solid ${statutFilter === s ? THEME : 'rgba(30,120,200,.2)'}`, borderRadius: 100, padding: '.3rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: statutFilter === s ? THEME : '#7a9ab8', cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
        <div style={{ fontSize: '.72rem', color: '#4a6880', fontStyle: 'italic' }}>Classés par niveau décroissant (SS → C).</div>
      </div>

      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', color: '#4a6880' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: .4 }}>🧬</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Aucun PDS</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter le premier</button>
          </div>
        )}
        {filtered.map(p => {
          const tc = p.color || THEME
          return (
            <div key={p.id} style={{ background: '#0d2040', border: `1px solid rgba(30,120,200,.2)`, borderRadius: 14, overflow: 'hidden', transition: 'all .3s', position: 'relative' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.borderColor = tc; el.style.boxShadow = `0 18px 36px rgba(0,0,0,.4)` }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.borderColor = 'rgba(30,120,200,.2)'; el.style.boxShadow = 'none' }}>
              <div style={{ height: 3, background: tc }} />
              <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#0a1829,#050d1a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', overflow: 'hidden', cursor: (p.photos && p.photos[0]) ? 'zoom-in' : 'default' }}
                onClick={() => { if (p.photos && p.photos.length > 0) setLightbox({ images: p.photos, index: 0 }) }}>
                {p.photos && p.photos[0] && <img loading="lazy" src={p.photos[0]} alt={p.nom} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: .85 }} />}
                {p.emoji && <span style={{ position: 'relative', zIndex: 1, opacity: p.photos && p.photos[0] ? 0.3 : 1 }}>{p.emoji}</span>}
                {p.photos && p.photos.length > 1 && <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(5,13,26,.75)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 100, padding: '.15rem .5rem', fontSize: '.62rem', fontFamily: "'Cinzel',serif", color: '#e8eef5' }}>📷 {p.photos.length}</span>}
              </div>
              <div style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.65rem' }}>
                  {p.type && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: `${tc}22`, color: tc, border: `1px solid ${tc}44` }}>{p.type}</div>}
                  {p.classe && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: 'rgba(240,192,64,.15)', color: '#f0c040', border: '1px solid rgba(240,192,64,.35)' }}>Classe {p.classe}</div>}
                  {p.statut && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: 'rgba(122,154,184,.15)', color: '#7a9ab8', border: '1px solid rgba(122,154,184,.35)' }}>{p.statut}</div>}
                  {p.hereditaire && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: 'rgba(160,96,255,.15)', color: '#a060ff', border: '1px solid rgba(160,96,255,.35)' }}>🧬 Héréditaire</div>}
                </div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.05rem', fontWeight: 700, color: '#e8eef5', marginBottom: '.12rem' }}>{p.nom}</div>
                {p.code && <div style={{ fontSize: '.78rem', color: '#4a6880', marginBottom: '.65rem', fontFamily: 'monospace' }}>{p.code}</div>}
                {p.pouvoir && (
                  <div style={{ marginBottom: '.85rem' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.25rem' }}>⚡ Pouvoir</div>
                    <div style={{ fontSize: '.85rem', color: '#c8d8e8', lineHeight: 1.6 }}>{p.pouvoir}</div>
                  </div>
                )}
                {p.faiblesse && <div style={{ fontSize: '.8rem', color: '#ff6060', marginBottom: '.65rem' }}>⚠️ {p.faiblesse}</div>}
                {p.objectif_etude && <div style={{ fontSize: '.78rem', color: '#7a9ab8', marginBottom: '.65rem', fontStyle: 'italic' }}>🔬 {p.objectif_etude}</div>}
                {(p.despas_derives || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginBottom: '.65rem' }}>
                    {(p.despas_derives || []).map(dn => (
                      despasMap.has(dn)
                        ? <a key={dn} href={`/despa?q=${encodeURIComponent(dn)}`} style={{ fontSize: '.72rem', color: THEME, textDecoration: 'none' }}>🦾 {dn}</a>
                        : <span key={dn} style={{ fontSize: '.72rem', color: '#7a9ab8' }}>🦾 {dn}</span>
                    ))}
                  </div>
                )}
                {p.sujet_nom && (
                  <div style={{ background: '#0a1829', border: '1px solid rgba(30,120,200,.2)', borderRadius: 10, padding: '.75rem .9rem', marginBottom: '.65rem', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                    {p.sujet_photos && p.sujet_photos[0] ? (
                      <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `2px solid ${tc}`, cursor: 'zoom-in', position: 'relative' }}
                        onClick={e => { e.stopPropagation(); setLightbox({ images: p.sujet_photos!, index: 0 }) }}>
                        <img loading="lazy" src={p.sujet_photos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {p.sujet_photos.length > 1 && <span style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(5,13,26,.85)', color: '#e8eef5', fontSize: '.42rem', fontFamily: "'Cinzel',serif", padding: '0 3px' }}>+{p.sujet_photos.length - 1}</span>}
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👤</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.2rem' }}>👤 Sujet</div>
                      <div style={{ fontSize: '.88rem', color: '#e8eef5', fontWeight: 700, marginBottom: p.sujet_statut ? '.15rem' : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sujet_nom}</div>
                      {p.sujet_statut && <div style={{ fontSize: '.78rem', color: '#7a9ab8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sujet_statut}</div>}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => duplicatePds(p)} title="Dupliquer" style={{ background: 'rgba(160,96,255,.1)', border: '1px solid rgba(160,96,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#a060ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>⧉</button>
                  <button onClick={() => openForm(p)} style={{ background: 'rgba(0,200,255,.1)', border: '1px solid rgba(0,200,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#00c8ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>✏️</button>
                  <button onClick={() => deletePds(p.id)} style={{ background: 'rgba(224,48,48,.1)', border: '1px solid rgba(224,48,48,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#ff6060', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>🗑</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={S.modal}>
            <div style={{ padding: '1.35rem 1.75rem', borderBottom: '1px solid rgba(30,120,200,.2)', position: 'sticky', top: 0, background: '#0a1829', borderRadius: '18px 18px 0 0', zIndex: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.15rem', color: THEME }}>{editId ? '✏️ Modifier le PDS' : '✚ Nouveau PDS'}</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'rgba(5,13,26,.75)', border: '1px solid rgba(30,120,200,.2)', color: '#7a9ab8', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
              </div>
              <div style={{ fontSize: '.78rem', color: '#7a9ab8', marginTop: '.5rem' }}>Documente le sujet : son pouvoir, ses limites, et son histoire.</div>
            </div>

            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={S.label}>🖼️ Images / Photos du PDS</label>
                <PhotoGrid
                  photos={form.photos || []} previews={photoPreviews}
                  onRemoveExisting={i => setForm(f => ({ ...f, photos: (f.photos || []).filter((_, j) => j !== i) }))}
                  onRemoveNew={i => { setPhotoPreviews(p => p.filter((_, j) => j !== i)); setPhotoFiles(p => p.filter((_, j) => j !== i)) }}
                  onAdd={addPdsPhotos} dragOver={dragOverPds} setDragOver={setDragOverPds}
                  openLightbox={i => setLightbox({ images: form.photos || [], index: i })}
                />
                <div style={{ marginTop: '.65rem' }}>
                  <label style={{ ...S.label, color: '#7a9ab8' }}>Ou URL directe (Imgur, Discord...)</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.gif" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) { setForm(f => ({ ...f, photos: [...(f.photos || []), val] })); (e.target as HTMLInputElement).value = '' }
                    }
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Nom du PDS *</label><input style={S.input} value={form.nom || ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Lamentation du Colosse" /></div>
                <div><label style={S.label}>Code</label><input style={S.input} value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PDS-ÆA-SS00" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Type</label>
                  <select style={{ ...S.input }} value={form.type || 'Résonance'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Classe</label>
                  <select style={{ ...S.input }} value={form.classe || 'C'} onChange={e => setForm(f => ({ ...f, classe: e.target.value }))}>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Statut actuel</label>
                  <select style={{ ...S.input }} value={form.statut || 'Actif'} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {statuts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Héréditaire</label>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    {[['Non', false], ['Oui', true]].map(([lbl, val]) => (
                      <button key={lbl as string} type="button" onClick={() => setForm(f => ({ ...f, hereditaire: val as boolean }))}
                        style={{ flex: 1, background: form.hereditaire === val ? 'rgba(160,96,255,.15)' : '#0a1829', border: `1px solid ${form.hereditaire === val ? '#a060ff' : 'rgba(30,120,200,.2)'}`, borderRadius: 9, padding: '.65rem', fontFamily: "'Cinzel',serif", fontSize: '.7rem', color: form.hereditaire === val ? '#a060ff' : '#7a9ab8', cursor: 'pointer' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.85rem', alignItems: 'end' }}>
                <div><label style={S.label}>Emoji (optionnel)</label><input style={{ ...S.input, width: 70, fontSize: '1.4rem', textAlign: 'center' }} value={form.emoji || ''} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🧬" /></div>
                <div><label style={S.label}>Couleur accent</label><input type="color" style={{ ...S.input, height: 42, padding: '.3rem' }} value={form.color || THEME} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              </div>

              <div><label style={S.label}>Pouvoir</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.7 }} value={form.pouvoir || ''} onChange={e => setForm(f => ({ ...f, pouvoir: e.target.value }))} placeholder="L'anomalie observée et ses effets..." /></div>
              <div><label style={S.label}>Faiblesse</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.faiblesse || ''} onChange={e => setForm(f => ({ ...f, faiblesse: e.target.value }))} placeholder="Ce qui rend le sujet dangereux/instable..." /></div>
              <div><label style={S.label}>Objectif d&apos;étude</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.objectif_etude || ''} onChange={e => setForm(f => ({ ...f, objectif_etude: e.target.value }))} placeholder="Pourquoi ce PDS est étudié..." /></div>

              <div>
                <label style={S.label}>🦾 Despa(s) dérivé(s)</label>
                {despasList.length === 0 && <div style={{ fontSize: '.8rem', color: '#4a6880', fontStyle: 'italic' }}>Aucun DS créé pour l&apos;instant.</div>}
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {despasList.map(d => {
                    const active = (form.despas_derives || []).includes(d.nom)
                    return (
                      <button key={d.id} type="button" onClick={() => setForm(f => {
                        const current = f.despas_derives || []
                        return { ...f, despas_derives: active ? current.filter(n => n !== d.nom) : [...current, d.nom] }
                      })} style={{ background: active ? `${THEME}26` : '#0a1829', border: `1px solid ${active ? THEME : 'rgba(30,120,200,.2)'}`, borderRadius: 100, padding: '.35rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.62rem', color: active ? THEME : '#7a9ab8', cursor: 'pointer' }}>
                        {active ? '✓ ' : ''}{d.nom}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 10, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...S.label, marginBottom: 0 }}>👤 Sujet / Personnage</div>
                <div><label style={{ ...S.label, color: '#7a9ab8' }}>Nom du sujet</label><input style={S.input} value={form.sujet_nom || ''} onChange={e => setForm(f => ({ ...f, sujet_nom: e.target.value }))} placeholder="Nom du sujet" /></div>
                <div><label style={{ ...S.label, color: '#7a9ab8' }}>Statut du sujet</label><input style={S.input} value={form.sujet_statut || ''} onChange={e => setForm(f => ({ ...f, sujet_statut: e.target.value }))} placeholder="Porteur originel — disparu" /></div>
                <div>
                  <label style={{ ...S.label, color: '#7a9ab8' }}>Images du sujet</label>
                  <PhotoGrid
                    photos={form.sujet_photos || []} previews={sujetPhotoPreviews}
                    onRemoveExisting={i => setForm(f => ({ ...f, sujet_photos: (f.sujet_photos || []).filter((_, j) => j !== i) }))}
                    onRemoveNew={i => { setSujetPhotoPreviews(p => p.filter((_, j) => j !== i)); setSujetPhotoFiles(p => p.filter((_, j) => j !== i)) }}
                    onAdd={addSujetPhotos} dragOver={dragOverSujet} setDragOver={setDragOverSujet}
                    openLightbox={i => setLightbox({ images: form.sujet_photos || [], index: i })}
                  />
                </div>
                <div><label style={{ ...S.label, color: '#7a9ab8' }}>Biographie</label><textarea style={{ ...S.input, minHeight: 140, resize: 'vertical', lineHeight: 1.7 }} value={form.sujet_biographie || ''} onChange={e => setForm(f => ({ ...f, sujet_biographie: e.target.value }))} placeholder="Histoire complète du sujet..." /></div>
                <div><label style={{ ...S.label, color: '#7a9ab8' }}>Notes de surveillance</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.sujet_notes || ''} onChange={e => setForm(f => ({ ...f, sujet_notes: e.target.value }))} placeholder="Observations récentes..." /></div>
              </div>
            </div>

            <div style={{ padding: '1.1rem 1.75rem', borderTop: '1px solid rgba(30,120,200,.2)', display: 'flex', gap: '.65rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#0a1829', borderRadius: '0 0 18px 18px' }}>
              <button style={S.btnCyan} onClick={() => setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm} disabled={uploading}>{uploading ? '⏳ Upload...' : '💾 Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} onIndexChange={i => setLightbox(lb => lb ? { ...lb, index: i } : lb)} />}
    </div>
  )
}
