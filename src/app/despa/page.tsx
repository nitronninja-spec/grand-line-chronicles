'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import { fetchCategoryValues } from '@/lib/categories'
import GlobalSearch from '@/components/GlobalSearch'
import PersonnageSearchSelect from '@/components/PersonnageSearchSelect'

interface Despa {
  id: string
  nom: string
  code?: string
  type?: string
  classe?: string
  statut?: string
  modificateur?: string
  emoji?: string
  description?: string
  capacites?: string
  cout?: string
  proprietaire?: string
  ancien_detenteur?: string
  color?: string
  photo?: string
}

const THEME = '#7c5cff'
const FALLBACK_TYPES = ['Cristallin', 'Biologique', 'Hybride', 'Technologique']
const FALLBACK_CLASSES = ['C', 'B', 'A', 'S', 'SS']
const FALLBACK_STATUTS = ['Actif', 'Perdu', 'Inachevé', 'En Stase', 'Contrôlé']
const FALLBACK_MODIFICATEURS = ['Aucun', 'Consommable', 'Limité']
// Du plus faible au plus fort — sert à trier par niveau, SS (le plus fort) en tête.
function classeRank(c: string | undefined, classes: string[]) { const i = classes.indexOf(c || ''); return i === -1 ? -1 : i }
const EXPLAINER = "Un Despa est un objet — une prothèse artificielle qui donne un pouvoir à celui qui le porte. Il n'est jamais gratuit : chaque Despa impose un coût (douleur, instabilité, dépendance...). Remplis cette fiche pour documenter un Despa existant dans l'univers : son origine, ses capacités, et qui le porte actuellement."

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  header: { padding: '2.5rem 2rem 1.5rem', maxWidth: 1400, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem', padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' },
  btnGold: { background: `linear-gradient(135deg, ${THEME}, #5a3ccc)`, color: '#fff', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: `1px solid ${THEME}66`, borderRadius: 18, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

const navLinks = [['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'], ['DS', '/despa'], ['PDS', '/pds'], ['Lames', '/lames'], ['Cristaux', '/cristaux'], ['Îles', '/iles'], ['Factions', '/factions'], ['Journaux', '/journaux'], ['Lore', '/lore'], ['Dashboard', '/dashboard']]

export default function DespaPage() {
  const [list, setList] = useState<Despa[]>([])
  const [filtered, setFiltered] = useState<Despa[]>([])
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [personnages, setPersonnages] = useState<{ id: string; nom: string }[]>([])
  const [types, setTypes] = useState(FALLBACK_TYPES)
  const [classes, setClasses] = useState(FALLBACK_CLASSES)
  const [statuts, setStatuts] = useState(FALLBACK_STATUTS)
  const [modificateurs, setModificateurs] = useState(FALLBACK_MODIFICATEURS)
  const [form, setForm] = useState<Partial<Despa>>({
    nom: '', code: '', type: 'Cristallin', classe: 'C', statut: 'Actif', modificateur: 'Aucun', emoji: '', description: '', capacites: '', cout: '', proprietaire: '', ancien_detenteur: '', color: THEME
  })

  const personnageMap = new Map(personnages.map(p => [p.nom, p.id]))

  useEffect(() => {
    fetchList(); fetchPersonnages(); fetchTaxonomies()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])
  useEffect(() => {
    let l = list
    if (search) l = l.filter(d => d.nom.toLowerCase().includes(search.toLowerCase()))
    if (statutFilter) l = l.filter(d => d.statut === statutFilter)
    l = l.slice().sort((a, b) => classeRank(b.classe, classes) - classeRank(a.classe, classes))
    setFiltered(l)
  }, [list, search, statutFilter, classes])

  async function fetchTaxonomies() {
    const [t, c, s, m] = await Promise.all([
      fetchCategoryValues('despa', 'type', FALLBACK_TYPES),
      fetchCategoryValues('despa', 'classe', FALLBACK_CLASSES),
      fetchCategoryValues('despa', 'statut', FALLBACK_STATUTS),
      fetchCategoryValues('despa', 'modificateur', FALLBACK_MODIFICATEURS),
    ])
    setTypes(t); setClasses(c); setStatuts(s); setModificateurs(m)
  }

  async function fetchList() {
    const { data } = await supabase.from('despas').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchPersonnages() {
    const { data } = await supabase.from('personnages').select('id, nom').order('nom', { ascending: true })
    setPersonnages(data || [])
  }

  function openForm(d?: Despa) {
    if (d) { setForm(d); setEditId(d.id); setPhotoPreview(d.photo || '') }
    else { setForm({ nom: '', code: '', type: 'Cristallin', classe: 'C', statut: 'Actif', modificateur: 'Aucun', emoji: '', description: '', capacites: '', cout: '', proprietaire: '', ancien_detenteur: '', color: THEME }); setEditId(null); setPhotoPreview('') }
    setPhotoFile(null)
    setShowForm(true)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function saveForm() {
    if (!form.nom?.trim()) { alert('Le nom est obligatoire !'); return }
    setUploading(true)
    let photo = form.photo || null
    if (photoFile) photo = await uploadImage(photoFile, 'despa')
    const data = { ...form, photo }
    const { error } = editId
      ? await supabase.from('despas').update(data).eq('id', editId)
      : await supabase.from('despas').insert([data])
    setUploading(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    setShowForm(false)
    fetchList()
  }

  async function deleteDespa(id: string) {
    if (!confirm('Supprimer ce DS ?')) return
    await supabase.from('despas').delete().eq('id', id)
    fetchList()
  }

  async function duplicateDespa(d: Despa) {
    const { id, ...rest } = d
    void id
    await supabase.from('despas').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
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
            <a key={h} href={h} style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: h === '/despa' ? THEME : '#7a9ab8', textDecoration: 'none', padding: '.38rem .6rem', borderRadius: 6, whiteSpace: 'nowrap', background: h === '/despa' ? `${THEME}26` : 'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding: '.38rem .85rem', textDecoration: 'none', fontSize: '.62rem' }}>⚓ MJ</a>
      </nav>

      <div style={S.header}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.1em', color: '#7a9ab8', textTransform: 'uppercase', marginBottom: '.4rem' }}>🏴‍☠️ › DS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 700, backgroundImage: `linear-gradient(135deg,#fff,${THEME})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>DS</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Nouveau DS</button>
        </div>

        {/* Bandeau explicatif — toujours visible, jamais un tooltip */}
        <div style={{ background: `${THEME}18`, border: `1px solid ${THEME}44`, borderLeft: `4px solid ${THEME}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '.88rem', color: '#c8d8e8', lineHeight: 1.6 }}>
          {EXPLAINER}
        </div>

        <div style={{ display: 'flex', gap: '.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: '#4a6880' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft: '2.5rem' }} placeholder="Rechercher un DS..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: .4 }}>🦾</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Aucun DS</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter le premier</button>
          </div>
        )}
        {filtered.map(d => {
          const tc = d.color || THEME
          return (
            <div key={d.id} style={{ background: '#0d2040', border: `1px solid rgba(30,120,200,.2)`, borderRadius: 14, overflow: 'hidden', transition: 'all .3s', position: 'relative' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.borderColor = tc; el.style.boxShadow = `0 18px 36px rgba(0,0,0,.4)` }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.borderColor = 'rgba(30,120,200,.2)'; el.style.boxShadow = 'none' }}>
              <div style={{ height: 3, background: tc }} />
              <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#0a1829,#050d1a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', overflow: 'hidden' }}>
                {d.photo && <img loading="lazy" src={d.photo} alt={d.nom} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: .85 }} />}
                {d.emoji && <span style={{ position: 'relative', zIndex: 1, opacity: d.photo ? 0.3 : 1 }}>{d.emoji}</span>}
              </div>
              <div style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.65rem' }}>
                  {d.type && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: `${tc}22`, color: tc, border: `1px solid ${tc}44` }}>{d.type}</div>}
                  {d.classe && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: 'rgba(240,192,64,.15)', color: '#f0c040', border: '1px solid rgba(240,192,64,.35)' }}>Classe {d.classe}</div>}
                  {d.statut && <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', background: 'rgba(122,154,184,.15)', color: '#7a9ab8', border: '1px solid rgba(122,154,184,.35)' }}>{d.statut}</div>}
                </div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.05rem', fontWeight: 700, color: '#e8eef5', marginBottom: '.12rem' }}>{d.nom}</div>
                {d.code && <div style={{ fontSize: '.78rem', color: '#4a6880', marginBottom: '.65rem', fontFamily: 'monospace' }}>{d.code}</div>}
                {d.description && <div style={{ fontSize: '.88rem', color: '#7a9ab8', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '.85rem' }}>{d.description}</div>}
                {d.capacites && (
                  <div style={{ marginBottom: '.85rem' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.25rem' }}>⚡ Capacités</div>
                    <div style={{ fontSize: '.85rem', color: '#c8d8e8', lineHeight: 1.6 }}>{d.capacites}</div>
                  </div>
                )}
                {d.cout && <div style={{ fontSize: '.8rem', color: '#ff6060', marginBottom: '.65rem' }}>⚠️ {d.cout}</div>}
                {d.modificateur && d.modificateur !== 'Aucun' && <div style={{ fontSize: '.78rem', color: '#a060ff', marginBottom: '.65rem' }}>🔧 {d.modificateur}</div>}
                {d.proprietaire && (
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.65rem' }}>
                    Porteur : {personnageMap.has(d.proprietaire)
                      ? <a href={`/personnages?open=${personnageMap.get(d.proprietaire)}`} style={{ color: '#00c8ff', textDecoration: 'none' }}>{d.proprietaire}</a>
                      : <span style={{ color: '#7a9ab8' }}>{d.proprietaire}</span>}
                  </div>
                )}
                {d.ancien_detenteur && (
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.65rem' }}>
                    Ancien porteur : {personnageMap.has(d.ancien_detenteur)
                      ? <a href={`/personnages?open=${personnageMap.get(d.ancien_detenteur)}`} style={{ color: '#00c8ff', textDecoration: 'none' }}>{d.ancien_detenteur}</a>
                      : <span style={{ color: '#7a9ab8' }}>{d.ancien_detenteur}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => duplicateDespa(d)} title="Dupliquer" style={{ background: 'rgba(160,96,255,.1)', border: '1px solid rgba(160,96,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#a060ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>⧉</button>
                  <button onClick={() => openForm(d)} style={{ background: 'rgba(0,200,255,.1)', border: '1px solid rgba(0,200,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#00c8ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>✏️</button>
                  <button onClick={() => deleteDespa(d.id)} style={{ background: 'rgba(224,48,48,.1)', border: '1px solid rgba(224,48,48,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#ff6060', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>🗑</button>
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
                <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.15rem', color: THEME }}>{editId ? '✏️ Modifier le DS' : '✚ Nouveau DS'}</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'rgba(5,13,26,.75)', border: '1px solid rgba(30,120,200,.2)', color: '#7a9ab8', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
              </div>
              <div style={{ fontSize: '.78rem', color: '#7a9ab8', marginTop: '.5rem' }}>Documente un Despa existant dans l&apos;univers : son origine, ses capacités, et qui le porte actuellement.</div>
            </div>

            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={S.label}>🖼️ Image / Photo du DS</label>
                <div style={{ border: '2px dashed rgba(30,120,200,.3)', borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#0d2040', position: 'relative' }}>
                  <input type="file" accept="image/*,.gif" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} onChange={handlePhoto} />
                  {photoPreview
                    ? <img loading="lazy" src={photoPreview} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 8 }} />
                    : <><div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🦾</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#7a9ab8' }}>Clique ou glisse une image</div><div style={{ fontSize: '.78rem', color: '#4a6880', marginTop: '.25rem', fontStyle: 'italic' }}>JPG, PNG, GIF animé — max 5 Mo</div></>}
                </div>
                {photoPreview && <button onClick={() => { setPhotoPreview(''); setPhotoFile(null); setForm(f => ({ ...f, photo: undefined })) }} style={{ marginTop: '.5rem', background: 'rgba(224,48,48,.12)', border: '1px solid rgba(224,48,48,.3)', borderRadius: 8, padding: '.3rem .75rem', color: '#ff6060', cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '.6rem' }}>✕ Supprimer la photo</button>}
                <div style={{ marginTop: '.5rem' }}>
                  <label style={{ ...S.label, color: '#7a9ab8' }}>Ou URL directe (Imgur, Discord...)</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.gif" onChange={e => { if (e.target.value) { setPhotoPreview(e.target.value); setForm(f => ({ ...f, photo: e.target.value })) } }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Nom du Despa *</label><input style={S.input} value={form.nom || ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nirvana Spectralis" /></div>
                <div><label style={S.label}>Code</label><input style={S.input} value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="DS-ÆS-A18" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Type</label>
                  <select style={{ ...S.input }} value={form.type || 'Cristallin'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
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
                <div><label style={S.label}>Modificateur</label>
                  <select style={{ ...S.input }} value={form.modificateur || 'Aucun'} onChange={e => setForm(f => ({ ...f, modificateur: e.target.value }))}>
                    {modificateurs.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.85rem', alignItems: 'end' }}>
                <div><label style={S.label}>Emoji (optionnel)</label><input style={{ ...S.input, width: 70, fontSize: '1.4rem', textAlign: 'center' }} value={form.emoji || ''} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🦾" /></div>
                <div><label style={S.label}>Couleur accent</label><input type="color" style={{ ...S.input, height: 42, padding: '.3rem' }} value={form.color || THEME} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              </div>
              <div><label style={S.label}>Porteur</label>
                <PersonnageSearchSelect personnages={personnages} value={form.proprietaire || ''} onChange={nom => setForm(f => ({ ...f, proprietaire: nom }))} placeholder="Rechercher un personnage ou Non attribué" inputStyle={S.input} />
              </div>
              <div><label style={S.label}>Ancien porteur</label>
                <PersonnageSearchSelect personnages={personnages} value={form.ancien_detenteur || ''} onChange={nom => setForm(f => ({ ...f, ancien_detenteur: nom }))} placeholder="Rechercher un personnage ou Aucun" inputStyle={S.input} />
              </div>
              <div><label style={S.label}>Origine / Histoire</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.7 }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ce Despa a été extrait/conçu à partir de..." /></div>
              <div><label style={S.label}>Capacités</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.7 }} value={form.capacites || ''} onChange={e => setForm(f => ({ ...f, capacites: e.target.value }))} placeholder="Ce Despa permet de..." /></div>
              <div><label style={S.label}>Coût / Contrepartie</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.cout || ''} onChange={e => setForm(f => ({ ...f, cout: e.target.value }))} placeholder="Douleur, instabilité, dépendance..." /></div>
            </div>

            <div style={{ padding: '1.1rem 1.75rem', borderTop: '1px solid rgba(30,120,200,.2)', display: 'flex', gap: '.65rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#0a1829', borderRadius: '0 0 18px 18px' }}>
              <button style={S.btnCyan} onClick={() => setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm} disabled={uploading}>{uploading ? '⏳ Upload...' : '💾 Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
