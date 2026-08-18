'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Lame {
  id: string
  nom: string
  jp?: string
  rang: string
  puissance?: number
  emoji?: string
  description?: string
  proprietaire?: string
  particularites?: string
  color?: string
  photo?: string
}

const RANGS = ['Lame de qualité', 'Lame de Grande qualité', 'Lame de 1er Ordre', 'Lame Légendaire']
const RANG_MAX: Record<string, number> = {
  'Lame de qualité': 100, 'Lame de Grande qualité': 50, 'Lame de 1er Ordre': 20, 'Lame Légendaire': 10
}
const RANG_COLORS: Record<string, string> = {
  'Lame de qualité': '#7a9ab8', 'Lame de Grande qualité': '#00c8ff', 'Lame de 1er Ordre': '#a060ff', 'Lame Légendaire': '#d4a017'
}
function rangLabel(r: string) { return RANG_MAX[r] ? `[${RANG_MAX[r]}] ${r}` : r }

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  header: { padding: '2.5rem 2rem 1.5rem', maxWidth: 1400, margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem', padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' },
  btnGold: { background: 'linear-gradient(135deg, #d4a017, #b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: '1px solid rgba(30,180,255,.4)', borderRadius: 18, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

const navLinks = [['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'], ['Despas', '/despas'], ['Lames', '/lames'], ['Cristaux', '/cristaux'], ['Îles', '/iles'], ['Factions', '/factions'], ['Relations', '/relations'], ['Journaux', '/journaux'], ['Lore', '/lore'], ['Dashboard', '/dashboard']]

export default function LamesPage() {
  const [list, setList] = useState<Lame[]>([])
  const [filtered, setFiltered] = useState<Lame[]>([])
  const [rangFilter, setRangFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [personnages, setPersonnages] = useState<{ id: string; nom: string }[]>([])
  const [form, setForm] = useState<Partial<Lame>>({
    nom: '', jp: '', rang: 'Lame de qualité', puissance: 5, emoji: '⚔️', description: '', proprietaire: '', particularites: '', color: '#7a9ab8'
  })

  const personnageMap = new Map(personnages.map(p => [p.nom, p.id]))

  useEffect(() => {
    fetchList(); fetchPersonnages()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])
  useEffect(() => {
    let l = rangFilter ? list.filter(l2 => l2.rang === rangFilter) : list
    if (search) l = l.filter(l2 => l2.nom.toLowerCase().includes(search.toLowerCase()))
    setFiltered(l)
  }, [list, rangFilter, search])

  async function fetchList() {
    const { data } = await supabase.from('lames').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchPersonnages() {
    const { data } = await supabase.from('personnages').select('id, nom').order('nom', { ascending: true })
    setPersonnages(data || [])
  }

  function openForm(l?: Lame) {
    if (l) { setForm(l); setEditId(l.id); setPhotoPreview(l.photo || '') }
    else { setForm({ nom: '', jp: '', rang: 'Lame de qualité', puissance: 5, emoji: '⚔️', description: '', proprietaire: '', particularites: '', color: '#7a9ab8' }); setEditId(null); setPhotoPreview('') }
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
    if (photoFile) photo = await uploadImage(photoFile, 'lames')
    const data = { ...form, photo }
    if (editId) await supabase.from('lames').update(data).eq('id', editId)
    else await supabase.from('lames').insert([data])
    setUploading(false)
    setShowForm(false)
    fetchList()
  }

  async function deleteLame(id: string) {
    if (!confirm('Supprimer cette lame ?')) return
    await supabase.from('lames').delete().eq('id', id)
    fetchList()
  }

  async function duplicateLame(l: Lame) {
    const { id, ...rest } = l
    void id
    await supabase.from('lames').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
    fetchList()
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus, select:focus { border-color: #d4a017 !important; box-shadow: 0 0 0 3px rgba(212,160,23,.15); }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d4a017; border-radius: 3px; }
      `}</style>

      <nav style={S.nav}>
        <a href="/" style={S.logo}>
          <span style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#d4a017,#f0c040)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☠</span>
          Grand Line
        </a>
        <div style={{ flex: 1, display: 'flex', gap: '.3rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {navLinks.map(([l, h]) => (
            <a key={h} href={h} style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: h === '/lames' ? '#f0c040' : '#7a9ab8', textDecoration: 'none', padding: '.38rem .6rem', borderRadius: 6, whiteSpace: 'nowrap', background: h === '/lames' ? 'rgba(212,160,23,.15)' : 'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding: '.38rem .85rem', textDecoration: 'none', fontSize: '.62rem' }}>⚓ MJ</a>
      </nav>

      <div style={S.header}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.1em', color: '#7a9ab8', textTransform: 'uppercase', marginBottom: '.4rem' }}>🏴‍☠️ › Lames</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 700, background: 'linear-gradient(135deg,#fff,#f0c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Lames</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter une lame</button>
        </div>
        <div style={{ display: 'flex', gap: '.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: '#4a6880' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft: '2.5rem' }} placeholder="Rechercher une lame..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['', ...RANGS].map(r => (
            <button key={r} onClick={() => setRangFilter(r)} style={{ background: rangFilter === r ? `${RANG_COLORS[r] || '#d4a017'}22` : '#0a1829', border: `1px solid ${rangFilter === r ? (RANG_COLORS[r] || '#d4a017') : 'rgba(30,120,200,.2)'}`, borderRadius: 100, padding: '.3rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: rangFilter === r ? (RANG_COLORS[r] || '#f0c040') : '#7a9ab8', cursor: 'pointer' }}>
              {r ? rangLabel(r) : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', color: '#4a6880' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: .4 }}>⚔️</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Aucune lame</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter la première</button>
          </div>
        )}
        {filtered.map(l => {
          const rc = RANG_COLORS[l.rang] || '#a060ff'
          return (
            <div key={l.id} style={{ background: '#0d2040', border: `1px solid rgba(30,120,200,.2)`, borderRadius: 14, overflow: 'hidden', transition: 'all .3s', position: 'relative' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.borderColor = rc; el.style.boxShadow = `0 18px 36px rgba(0,0,0,.4)` }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.borderColor = 'rgba(30,120,200,.2)'; el.style.boxShadow = 'none' }}>
              <div style={{ height: 3, background: rc }} />
              <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#0a1829,#050d1a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', overflow: 'hidden' }}>
                {l.photo && <img src={l.photo} alt={l.nom} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: .85 }} />}
                <span style={{ position: 'relative', zIndex: 1, opacity: l.photo ? 0.3 : 1 }}>{l.emoji || '⚔️'}</span>
              </div>
              <div style={{ padding: '1.1rem' }}>
                <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: '.65rem', background: `${rc}22`, color: rc, border: `1px solid ${rc}44` }}>{rangLabel(l.rang)}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.05rem', fontWeight: 700, color: '#e8eef5', marginBottom: '.12rem' }}>{l.nom}</div>
                {l.jp && <div style={{ fontSize: '.78rem', color: '#4a6880', marginBottom: '.65rem' }}>{l.jp}</div>}
                {l.description && <div style={{ fontSize: '.88rem', color: '#7a9ab8', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '.85rem' }}>{l.description}</div>}
                {l.particularites && <div style={{ fontSize: '.8rem', color: '#4a6880', marginBottom: '.65rem' }}>✨ {l.particularites}</div>}
                {l.proprietaire && (
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.65rem' }}>
                    Propriétaire : {personnageMap.has(l.proprietaire)
                      ? <a href={`/personnages?open=${personnageMap.get(l.proprietaire)}`} style={{ color: '#00c8ff', textDecoration: 'none' }}>{l.proprietaire}</a>
                      : <span style={{ color: '#7a9ab8' }}>{l.proprietaire}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.85rem' }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', width: 48, flexShrink: 0 }}>Puissance</div>
                  <div style={{ flex: 1, height: 4, background: '#0a1829', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(l.puissance || 5) * 10}%`, background: `linear-gradient(90deg,${rc},${rc}99)`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', color: rc, fontWeight: 700, width: 18, textAlign: 'right' }}>{l.puissance || 5}</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => duplicateLame(l)} title="Dupliquer" style={{ background: 'rgba(160,96,255,.1)', border: '1px solid rgba(160,96,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#a060ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>⧉</button>
                  <button onClick={() => openForm(l)} style={{ background: 'rgba(0,200,255,.1)', border: '1px solid rgba(0,200,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#00c8ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>✏️</button>
                  <button onClick={() => deleteLame(l.id)} style={{ background: 'rgba(224,48,48,.1)', border: '1px solid rgba(224,48,48,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#ff6060', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>🗑</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={S.modal}>
            <div style={{ padding: '1.35rem 1.75rem', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a1829', borderRadius: '18px 18px 0 0', zIndex: 5 }}>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.15rem', color: '#f0c040' }}>{editId ? '✏️ Modifier la Lame' : '✚ Nouvelle Lame'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(5,13,26,.75)', border: '1px solid rgba(30,120,200,.2)', color: '#7a9ab8', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
            </div>

            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={S.label}>🖼️ Image / Photo de la lame</label>
                <div style={{ border: '2px dashed rgba(30,120,200,.3)', borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#0d2040', position: 'relative' }}>
                  <input type="file" accept="image/*,.gif" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} onChange={handlePhoto} />
                  {photoPreview
                    ? <img src={photoPreview} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 8 }} />
                    : <><div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>⚔️</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#7a9ab8' }}>Clique ou glisse une image</div><div style={{ fontSize: '.78rem', color: '#4a6880', marginTop: '.25rem', fontStyle: 'italic' }}>JPG, PNG, GIF animé — max 5 Mo</div></>}
                </div>
                {photoPreview && <button onClick={() => { setPhotoPreview(''); setPhotoFile(null) }} style={{ marginTop: '.5rem', background: 'rgba(224,48,48,.12)', border: '1px solid rgba(224,48,48,.3)', borderRadius: 8, padding: '.3rem .75rem', color: '#ff6060', cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '.6rem' }}>✕ Supprimer la photo</button>}
                <div style={{ marginTop: '.5rem' }}>
                  <label style={{ ...S.label, color: '#7a9ab8' }}>Ou URL directe (Imgur, Discord...)</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.gif" onChange={e => { if (e.target.value) { setPhotoPreview(e.target.value); setForm(f => ({ ...f, photo: e.target.value })) } }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Nom de la lame *</label><input style={S.input} value={form.nom || ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Crocs de la Tempête" /></div>
                <div><label style={S.label}>Nom original / JP</label><input style={S.input} value={form.jp || ''} onChange={e => setForm(f => ({ ...f, jp: e.target.value }))} placeholder="Kaze no Kiba" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Rang</label>
                  <select style={{ ...S.input }} value={form.rang || 'Lame de qualité'} onChange={e => setForm(f => ({ ...f, rang: e.target.value }))}>
                    {RANGS.map(r => <option key={r} value={r}>{rangLabel(r)}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Puissance (1-10)</label><input style={S.input} type="number" min="1" max="10" value={form.puissance || 5} onChange={e => setForm(f => ({ ...f, puissance: parseInt(e.target.value) }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.85rem', alignItems: 'end' }}>
                <div><label style={S.label}>Emoji</label><input style={{ ...S.input, width: 70, fontSize: '1.4rem', textAlign: 'center' }} value={form.emoji || '⚔️'} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} /></div>
                <div><label style={S.label}>Couleur accent</label><input type="color" style={{ ...S.input, height: 42, padding: '.3rem' }} value={form.color || '#7a9ab8'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              </div>
              <div><label style={S.label}>Propriétaire</label>
                <input style={S.input} list="lame-personnages" value={form.proprietaire || ''} onChange={e => setForm(f => ({ ...f, proprietaire: e.target.value }))} placeholder="Nom du personnage ou Non attribuée" />
                <datalist id="lame-personnages">
                  {personnages.map(p => <option key={p.id} value={p.nom} />)}
                </datalist>
              </div>
              <div><label style={S.label}>Description / Histoire</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.7 }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Cette lame a été forgée..." /></div>
              <div><label style={S.label}>Particularités</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.particularites || ''} onChange={e => setForm(f => ({ ...f, particularites: e.target.value }))} placeholder="Capacités spéciales, résistance, malédiction..." /></div>
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
