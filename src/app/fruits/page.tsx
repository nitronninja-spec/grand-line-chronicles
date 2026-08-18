'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Fruit {
  id: string
  nom: string
  jp?: string
  type: string
  puissance?: number
  emoji?: string
  description?: string
  proprietaire?: string
  color?: string
  photo?: string
  faiblesses?: string
}

const TYPE_COLORS: Record<string, string> = {
  Paramecia: '#40d060', Logia: '#ff8c40', Zoan: '#a060ff', Mythical: '#d4a017'
}

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

// ─── Convertit un File en base64 ───────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // retire le préfixe data:image/...;base64,
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Zone de scan IA ───────────────────────────────────────────────────────
function ScanFicheIA({ onResult }: { onResult: (data: Partial<Fruit>) => void }) {
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState('')
  const [scanError, setScanError] = useState('')
  const [done, setDone] = useState(false)

  async function handleScanImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanPreview(URL.createObjectURL(file))
    setScanning(true)
    setScanError('')
    setDone(false)

    try {
      const base64 = await fileToBase64(file)
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const prompt = `Tu es un expert de l'univers One Piece. Analyse cette image qui est une fiche de fruit du démon pour un jeu de rôle.
Extrais toutes les informations visibles et déduis les informations manquantes en restant cohérent avec l'univers One Piece.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "nom": "<nom du fruit, ex: Kaze Kaze no Mi>",
  "jp": "<traduction ou nom japonais si visible, sinon déduis-le>",
  "type": "<Paramecia|Logia|Zoan|Mythical>",
  "puissance": <nombre entier 1-10>,
  "emoji": "<emoji qui représente le fruit>",
  "description": "<description complète des capacités du fruit, 2-4 phrases>",
  "proprietaire": "<nom du propriétaire si visible, sinon vide>",
  "faiblesses": "<faiblesses et limitations du fruit>",
  "color": "<couleur hex qui correspond au type ou à l'ambiance du fruit>"
}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 }
              },
              { type: 'text', text: prompt }
            ]
          }]
        })
      })

      const data = await res.json()
      const text = data.content?.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      onResult(parsed)
      setDone(true)
    } catch {
      setScanError("Impossible de lire la fiche. Essaie une image plus nette.")
    }
    setScanning(false)
  }

  return (
    <div style={{
      border: done ? '2px solid rgba(64,208,96,.4)' : '2px dashed rgba(212,160,23,.35)',
      borderRadius: 14,
      padding: '1.25rem',
      background: done ? 'rgba(64,208,96,.04)' : 'rgba(212,160,23,.04)',
      transition: 'all .4s',
      marginBottom: '1.5rem',
      position: 'relative',
    }}>
      {/* Header zone scan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(212,160,23,.2), rgba(212,160,23,.05))',
          border: '1px solid rgba(212,160,23,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
        }}>✨</div>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#d4a017', fontWeight: 700 }}>
            Scan IA — Auto-remplissage
          </div>
          <div style={{ fontSize: '.78rem', color: '#4a6880', fontStyle: 'italic', marginTop: '.1rem' }}>
            Uploade une photo de ta fiche, l'IA remplit tout automatiquement
          </div>
        </div>
      </div>

      {/* Zone de drop */}
      {!scanning && !done && (
        <label style={{
          display: 'block', cursor: 'pointer',
          background: '#0d2040',
          border: '1px solid rgba(212,160,23,.2)',
          borderRadius: 10, padding: '1.25rem',
          textAlign: 'center',
          transition: 'all .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(212,160,23,.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(212,160,23,.2)' }}
        >
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanImage} />
          {scanPreview
            ? <img src={scanPreview} style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', borderRadius: 8, margin: '0 auto', display: 'block' }} />
            : <>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📸</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#7a9ab8' }}>
                Clique pour uploader ta fiche
              </div>
              <div style={{ fontSize: '.75rem', color: '#4a6880', marginTop: '.3rem', fontStyle: 'italic' }}>
                Photo, scan, screenshot — JPG, PNG, WEBP
              </div>
            </>
          }
        </label>
      )}

      {/* Scanning */}
      {scanning && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          {scanPreview && <img src={scanPreview} style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain', borderRadius: 8, margin: '0 auto .75rem', display: 'block', opacity: .5 }} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4a017', animation: 'pulse 1s ease-in-out infinite' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4a017', animation: 'pulse 1s ease-in-out .2s infinite' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4a017', animation: 'pulse 1s ease-in-out .4s infinite' }} />
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#d4a017' }}>
            Analyse de la fiche en cours...
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {/* Succès */}
      {done && !scanning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {scanPreview && <img src={scanPreview} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid rgba(64,208,96,.3)' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#40d060', marginBottom: '.3rem' }}>
              ✅ Fiche analysée ! Les champs ont été remplis.
            </div>
            <div style={{ fontSize: '.78rem', color: '#4a6880', fontStyle: 'italic' }}>Vérifie et corrige si besoin avant d'enregistrer.</div>
          </div>
          <label style={{ cursor: 'pointer', background: 'none', border: '1px solid rgba(212,160,23,.3)', borderRadius: 8, padding: '.3rem .7rem', color: '#d4a017', fontFamily: "'Cinzel', serif", fontSize: '.55rem', letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanImage} />
            🔄 Rescanner
          </label>
        </div>
      )}

      {/* Erreur */}
      {scanError && (
        <div style={{ marginTop: '.75rem', background: 'rgba(224,48,48,.1)', border: '1px solid rgba(224,48,48,.25)', borderRadius: 8, padding: '.6rem .9rem', color: '#ff6060', fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.07em' }}>
          ⚠️ {scanError}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────
export default function FruitsPage() {
  const [list, setList] = useState<Fruit[]>([])
  const [filtered, setFiltered] = useState<Fruit[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [personnages, setPersonnages] = useState<{ id: string; nom: string }[]>([])
  const [form, setForm] = useState<Partial<Fruit>>({
    nom: '', jp: '', type: 'Paramecia', puissance: 5,
    emoji: '🍎', description: '', proprietaire: '', color: '#40d060', faiblesses: ''
  })

  const personnageMap = new Map(personnages.map(p => [p.nom, p.id]))

  useEffect(() => {
    fetchList(); fetchPersonnages()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])
  useEffect(() => {
    let l = typeFilter ? list.filter(f => f.type === typeFilter) : list
    if (search) l = l.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()))
    setFiltered(l)
  }, [list, typeFilter, search])

  async function fetchList() {
    const { data } = await supabase.from('fruits').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchPersonnages() {
    const { data } = await supabase.from('personnages').select('id, nom').order('nom', { ascending: true })
    setPersonnages(data || [])
  }

  function openForm(f?: Fruit) {
    if (f) { setForm(f); setEditId(f.id); setPhotoPreview(f.photo || '') }
    else { setForm({ nom: '', jp: '', type: 'Paramecia', puissance: 5, emoji: '🍎', description: '', proprietaire: '', color: '#40d060', faiblesses: '' }); setEditId(null); setPhotoPreview('') }
    setPhotoFile(null)
    setShowForm(true)
  }

  // ← Appelé par ScanFicheIA quand l'IA a fini d'analyser
  function handleScanResult(data: Partial<Fruit>) {
    setForm(prev => ({ ...prev, ...data }))
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
    if (photoFile) { photo = await uploadImage(photoFile, 'fruits') }
    const data = { ...form, photo }
    if (editId) await supabase.from('fruits').update(data).eq('id', editId)
    else await supabase.from('fruits').insert([data])
    setUploading(false)
    setShowForm(false)
    fetchList()
  }

  async function deleteFruit(id: string) {
    if (!confirm('Supprimer ce fruit ?')) return
    await supabase.from('fruits').delete().eq('id', id)
    fetchList()
  }

  async function duplicateFruit(f: Fruit) {
    const { id, ...rest } = f
    void id
    await supabase.from('fruits').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
    fetchList()
  }

  const navLinks = [['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'], ['Despas', '/despas'], ['Lames', '/lames'], ['Cristaux', '/cristaux'], ['Îles', '/iles'], ['Factions', '/factions'], ['Journaux', '/journaux'], ['Lore', '/lore'], ['Dashboard', '/dashboard']]

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
            <a key={h} href={h} style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: h === '/fruits' ? '#f0c040' : '#7a9ab8', textDecoration: 'none', padding: '.38rem .6rem', borderRadius: 6, whiteSpace: 'nowrap', background: h === '/fruits' ? 'rgba(212,160,23,.15)' : 'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding: '.38rem .85rem', textDecoration: 'none', fontSize: '.62rem' }}>⚓ MJ</a>
      </nav>

      <div style={S.header}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.1em', color: '#7a9ab8', textTransform: 'uppercase', marginBottom: '.4rem' }}>🏴‍☠️ › Fruits du Démon</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 700, background: 'linear-gradient(135deg,#fff,#f0c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Fruits du Démon</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter un fruit</button>
        </div>
        <div style={{ display: 'flex', gap: '.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: '#4a6880' }}>🔍</span>
            <input style={{ ...S.input, paddingLeft: '2.5rem' }} placeholder="Rechercher un fruit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['', 'Paramecia', 'Logia', 'Zoan', 'Mythical'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter === t ? 'rgba(212,160,23,.15)' : '#0a1829', border: `1px solid ${typeFilter === t ? '#d4a017' : 'rgba(30,120,200,.2)'}`, borderRadius: 100, padding: '.3rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: typeFilter === t ? '#f0c040' : '#7a9ab8', cursor: 'pointer' }}>
              {t || 'Tous'}
            </button>
          ))}
        </div>
      </div>

      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', color: '#4a6880' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: .4 }}>🍎</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Aucun fruit du démon</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter le premier</button>
          </div>
        )}
        {filtered.map(f => {
          const tc = TYPE_COLORS[f.type] || '#a060ff'
          return (
            <div key={f.id} style={{ background: '#0d2040', border: `1px solid rgba(30,120,200,.2)`, borderRadius: 14, overflow: 'hidden', transition: 'all .3s', position: 'relative' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.borderColor = tc; el.style.boxShadow = `0 18px 36px rgba(0,0,0,.4)` }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; el.style.borderColor = 'rgba(30,120,200,.2)'; el.style.boxShadow = 'none' }}>
              <div style={{ height: 3, background: tc }} />
              <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#0a1829,#050d1a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', overflow: 'hidden' }}>
                {f.photo && <img src={f.photo} alt={f.nom} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: .85 }} />}
                <span style={{ position: 'relative', zIndex: 1, opacity: f.photo ? 0.3 : 1 }}>{f.emoji || '🍎'}</span>
              </div>
              <div style={{ padding: '1.1rem' }}>
                <div style={{ display: 'inline-block', borderRadius: 100, padding: '.18rem .65rem', fontFamily: "'Cinzel',serif", fontSize: '.52rem', letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: '.65rem', background: `${tc}22`, color: tc, border: `1px solid ${tc}44` }}>{f.type}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.05rem', fontWeight: 700, color: '#e8eef5', marginBottom: '.12rem' }}>{f.nom}</div>
                {f.jp && <div style={{ fontSize: '.78rem', color: '#4a6880', marginBottom: '.65rem' }}>{f.jp}</div>}
                {f.description && <div style={{ fontSize: '.88rem', color: '#7a9ab8', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '.85rem' }}>{f.description}</div>}
                {f.proprietaire && (
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.65rem' }}>
                    Propriétaire : {personnageMap.has(f.proprietaire)
                      ? <a href={`/personnages?open=${personnageMap.get(f.proprietaire)}`} style={{ color: '#00c8ff', textDecoration: 'none' }}>{f.proprietaire}</a>
                      : <span style={{ color: '#7a9ab8' }}>{f.proprietaire}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.85rem' }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880', width: 48, flexShrink: 0 }}>Puissance</div>
                  <div style={{ flex: 1, height: 4, background: '#0a1829', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(f.puissance || 5) * 10}%`, background: `linear-gradient(90deg,${tc},${tc}99)`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', color: tc, fontWeight: 700, width: 18, textAlign: 'right' }}>{f.puissance || 5}</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => duplicateFruit(f)} title="Dupliquer" style={{ background: 'rgba(160,96,255,.1)', border: '1px solid rgba(160,96,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#a060ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>⧉</button>
                  <button onClick={() => openForm(f)} style={{ background: 'rgba(0,200,255,.1)', border: '1px solid rgba(0,200,255,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#00c8ff', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>✏️</button>
                  <button onClick={() => deleteFruit(f.id)} style={{ background: 'rgba(224,48,48,.1)', border: '1px solid rgba(224,48,48,.25)', borderRadius: 8, padding: '.2rem .5rem', color: '#ff6060', cursor: 'pointer', fontSize: '.7rem', fontFamily: "'Cinzel',serif" }}>🗑</button>
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
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.15rem', color: '#f0c040' }}>{editId ? '✏️ Modifier le Fruit' : '✚ Nouveau Fruit du Démon'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(5,13,26,.75)', border: '1px solid rgba(30,120,200,.2)', color: '#7a9ab8', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
            </div>

            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* ✨ SCAN IA — seulement à la création */}
              {!editId && <ScanFicheIA onResult={handleScanResult} />}

              {/* Photo du fruit */}
              <div>
                <label style={S.label}>🖼️ Image / Photo du fruit</label>
                <div style={{ border: '2px dashed rgba(30,120,200,.3)', borderRadius: 10, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: '#0d2040', position: 'relative' }}>
                  <input type="file" accept="image/*,.gif" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} onChange={handlePhoto} />
                  {photoPreview
                    ? <img src={photoPreview} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 8 }} />
                    : <><div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🍎</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#7a9ab8' }}>Clique ou glisse une image</div><div style={{ fontSize: '.78rem', color: '#4a6880', marginTop: '.25rem', fontStyle: 'italic' }}>JPG, PNG, GIF animé — max 5 Mo</div></>}
                </div>
                {photoPreview && <button onClick={() => { setPhotoPreview(''); setPhotoFile(null) }} style={{ marginTop: '.5rem', background: 'rgba(224,48,48,.12)', border: '1px solid rgba(224,48,48,.3)', borderRadius: 8, padding: '.3rem .75rem', color: '#ff6060', cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '.6rem' }}>✕ Supprimer la photo</button>}
                <div style={{ marginTop: '.5rem' }}>
                  <label style={{ ...S.label, color: '#7a9ab8' }}>Ou URL directe (Imgur, Discord...)</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.gif" onChange={e => { if (e.target.value) { setPhotoPreview(e.target.value); setForm(f => ({ ...f, photo: e.target.value })) } }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Nom du fruit *</label><input style={S.input} value={form.nom || ''} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Kaze Kaze no Mi" /></div>
                <div><label style={S.label}>Traduction / JP</label><input style={S.input} value={form.jp || ''} onChange={e => setForm(f => ({ ...f, jp: e.target.value }))} placeholder="Fruit du Vent" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
                <div><label style={S.label}>Type</label>
                  <select style={{ ...S.input }} value={form.type || 'Paramecia'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="Paramecia">Paramecia</option>
                    <option value="Logia">Logia</option>
                    <option value="Zoan">Zoan</option>
                    <option value="Mythical">Mythical Zoan</option>
                  </select>
                </div>
                <div><label style={S.label}>Puissance (1-10)</label><input style={S.input} type="number" min="1" max="10" value={form.puissance || 5} onChange={e => setForm(f => ({ ...f, puissance: parseInt(e.target.value) }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.85rem', alignItems: 'end' }}>
                <div><label style={S.label}>Emoji</label><input style={{ ...S.input, width: 70, fontSize: '1.4rem', textAlign: 'center' }} value={form.emoji || '🍎'} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} /></div>
                <div><label style={S.label}>Couleur accent</label><input type="color" style={{ ...S.input, height: 42, padding: '.3rem' }} value={form.color || '#40d060'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              </div>
              <div><label style={S.label}>Propriétaire</label>
                <input style={S.input} list="fruit-personnages" value={form.proprietaire || ''} onChange={e => setForm(f => ({ ...f, proprietaire: e.target.value }))} placeholder="Nom du personnage ou Non attribué" />
                <datalist id="fruit-personnages">
                  {personnages.map(p => <option key={p.id} value={p.nom} />)}
                </datalist>
              </div>
              <div><label style={S.label}>Description / Capacités</label><textarea style={{ ...S.input, minHeight: 90, resize: 'vertical', lineHeight: 1.7 }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ce fruit permet de..." /></div>
              <div><label style={S.label}>Faiblesses</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical', lineHeight: 1.7 }} value={form.faiblesses || ''} onChange={e => setForm(f => ({ ...f, faiblesses: e.target.value }))} placeholder="Faiblesses et limitations..." /></div>
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
