'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Faction {
  id: string
  nom: string
  emoji?: string
  type?: string
  rel_x?: number | null
  rel_y?: number | null
}
interface Relation {
  id: string
  faction_a: string
  faction_b: string
  type: string
  note?: string
}
type Pos = { x: number; y: number }

const REL_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  alliance: { label: 'Alliance', icon: '🤝', color: '#40d060' },
  ennemie: { label: 'Ennemie', icon: '⚔️', color: '#e03030' },
  neutre: { label: 'Neutre', icon: '➖', color: '#7a9ab8' },
}

function computeInitialPositions(list: Faction[]): Record<string, Pos> {
  const pos: Record<string, Pos> = {}
  const cx = 50, cy = 50, r = 36
  list.forEach((f, i) => {
    if (f.rel_x != null && f.rel_y != null) {
      pos[f.id] = { x: f.rel_x, y: f.rel_y }
    } else {
      const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2
      pos[f.id] = { x: cx + r * Math.cos(angle), y: cy + r * 0.72 * Math.sin(angle) }
    }
  })
  return pos
}

const S = {
  page: { minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 } as React.CSSProperties,
  nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,120,200,.2)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' },
  logo: { fontFamily: "'Cinzel Decorative',serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg,#f0c040,#d4a017)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' },
  btnGold: { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel',serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnCyan: { background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.7rem 1.4rem', fontFamily: "'Cinzel',serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, cursor: 'pointer' },
  input: { width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.2)', borderRadius: 9, padding: '.65rem .9rem', color: '#e8eef5', fontFamily: "'Crimson Pro',serif", fontSize: '.95rem', outline: 'none' },
  label: { fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.11em', textTransform: 'uppercase' as const, color: '#4a6880', marginBottom: '.4rem', display: 'block' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0a1829', border: '1px solid rgba(30,180,255,.4)', borderRadius: 18, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 40px 80px rgba(0,0,0,.8)' },
}

export default function RelationsPage() {
  const [factions, setFactions] = useState<Faction[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const [dragging, setDragging] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [showRelForm, setShowRelForm] = useState(false)
  const [relEditId, setRelEditId] = useState<string | null>(null)
  const [relForm, setRelForm] = useState<Partial<Relation>>({ faction_a: '', faction_b: '', type: 'alliance', note: '' })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchFactions(); fetchRelations() }, [])

  async function fetchFactions() {
    const { data } = await supabase.from('factions').select('id, nom, emoji, type, rel_x, rel_y').order('nom', { ascending: true })
    const list = data || []
    setFactions(list)
    setPositions(computeInitialPositions(list))
  }

  async function fetchRelations() {
    const { data } = await supabase.from('faction_relations').select('*').order('created_at', { ascending: true })
    setRelations(data || [])
  }

  function onNodePointerDown(e: React.PointerEvent, id: string) {
    if (!canvasRef.current) return
    e.stopPropagation()
    setDragging({ id, rect: canvasRef.current.getBoundingClientRect() })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onNodePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const { rect } = dragging
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100
    x = Math.min(96, Math.max(4, x))
    y = Math.min(94, Math.max(6, y))
    setPositions(p => ({ ...p, [dragging.id]: { x, y } }))
  }
  async function onNodePointerUp() {
    if (!dragging) return
    const pos = positions[dragging.id]
    const id = dragging.id
    setDragging(null)
    if (pos) await supabase.from('factions').update({ rel_x: pos.x, rel_y: pos.y }).eq('id', id)
  }

  function openRelForm(r?: Relation) {
    if (r) { setRelForm(r); setRelEditId(r.id) }
    else { setRelForm({ faction_a: '', faction_b: '', type: 'alliance', note: '' }); setRelEditId(null) }
    setShowRelForm(true)
  }

  async function saveRelation() {
    if (!relForm.faction_a || !relForm.faction_b) { alert('Choisis les deux factions.'); return }
    if (relForm.faction_a === relForm.faction_b) { alert('Choisis deux factions différentes.'); return }
    const data = { faction_a: relForm.faction_a, faction_b: relForm.faction_b, type: relForm.type || 'alliance', note: relForm.note || '' }
    if (relEditId) await supabase.from('faction_relations').update(data).eq('id', relEditId)
    else await supabase.from('faction_relations').insert([data])
    setShowRelForm(false)
    fetchRelations()
  }

  async function deleteRelation(id: string) {
    if (!confirm('Supprimer cette relation ?')) return
    await supabase.from('faction_relations').delete().eq('id', id)
    fetchRelations()
  }

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Despas','/despas'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Relations','/relations'],['Journaux','/journaux'],['Lore','/lore'],['Dashboard','/dashboard']]

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
          <span style={{ width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>☠</span>
          Grand Line
        </a>
        <div style={{ flex:1, display:'flex', gap:'.3rem', overflowX:'auto', scrollbarWidth:'none' }}>
          {navLinks.map(([l,h]) => (
            <a key={h} href={h} style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.06em', textTransform:'uppercase', color: h==='/relations'?'#f0c040':'#7a9ab8', textDecoration:'none', padding:'.38rem .6rem', borderRadius:6, whiteSpace:'nowrap', background: h==='/relations'?'rgba(212,160,23,.15)':'none' }}>{l}</a>
          ))}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{ ...S.btnGold, padding:'.38rem .85rem', textDecoration:'none', fontSize:'.62rem' }}>⚓ MJ</a>
      </nav>

      <div style={{ padding:'2.5rem 2rem 1.5rem', maxWidth:1400, margin:'0 auto' }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.1em', color:'#7a9ab8', textTransform:'uppercase', marginBottom:'.4rem' }}>
          🏴‍☠️ › Relations
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
          <div>
            <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'clamp(1.8rem,3.5vw,3rem)', fontWeight:700, background:'linear-gradient(135deg,#fff,#f0c040)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Relations entre factions
            </h1>
            <p style={{ color:'#7a9ab8', fontSize:'.9rem', marginTop:'.3rem' }}>Glisse les factions pour organiser le schéma. Clique un nœud pour surligner ses liens, ou un lien pour le modifier.</p>
          </div>
          <button style={S.btnGold} onClick={() => openRelForm()}>＋ Nouvelle relation</button>
        </div>

        {/* Légende */}
        <div style={{ display:'flex', gap:'1.2rem', flexWrap:'wrap', marginBottom:'1rem' }}>
          {Object.entries(REL_TYPES).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'.4rem', fontSize:'.8rem', color:'#c8d8e8' }}>
              <span style={{ width:22, height:3, background:v.color, borderRadius:2, display:'inline-block' }} />
              {v.icon} {v.label}
            </div>
          ))}
        </div>

        {/* Canvas */}
        {factions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'5rem 2rem', color:'#4a6880' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:.4 }}>🕸️</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.72rem', letterSpacing:'.1em', textTransform:'uppercase' }}>Crée d&apos;abord des factions</div>
          </div>
        ) : (
          <div ref={canvasRef} onClick={() => setHighlight(null)}
            style={{ position:'relative', width:'100%', height:600, background:'radial-gradient(circle at center,#0d2040,#050d1a)', border:'1px solid rgba(30,120,200,.2)', borderRadius:16, overflow:'hidden', touchAction:'none' }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
              {relations.map(r => {
                const fa = factions.find(f => f.nom === r.faction_a)
                const fb = factions.find(f => f.nom === r.faction_b)
                if (!fa || !fb) return null
                const pa = positions[fa.id]; const pb = positions[fb.id]
                if (!pa || !pb) return null
                const color = REL_TYPES[r.type]?.color || '#7a9ab8'
                const dim = highlight && fa.id !== highlight && fb.id !== highlight
                return <line key={r.id} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeWidth={dim ? 0.15 : 0.35} opacity={dim ? 0.2 : 0.85} />
              })}
            </svg>

            {relations.map(r => {
              const fa = factions.find(f => f.nom === r.faction_a)
              const fb = factions.find(f => f.nom === r.faction_b)
              if (!fa || !fb) return null
              const pa = positions[fa.id]; const pb = positions[fb.id]
              if (!pa || !pb) return null
              const rt = REL_TYPES[r.type] || REL_TYPES.neutre
              const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2
              const dim = highlight && fa.id !== highlight && fb.id !== highlight
              return (
                <div key={r.id} onClick={e => { e.stopPropagation(); openRelForm(r) }}
                  title={`${r.faction_a} — ${rt.label} — ${r.faction_b}`}
                  style={{ position:'absolute', left:`${mx}%`, top:`${my}%`, transform:'translate(-50%,-50%)', cursor:'pointer', background:'#0a1829', border:`1px solid ${rt.color}`, borderRadius:100, padding:'.15rem .5rem', fontSize:'.8rem', zIndex:2, opacity: dim ? 0.25 : 1 }}>
                  {rt.icon}
                </div>
              )
            })}

            {factions.map(f => {
              const pos = positions[f.id] || { x:50, y:50 }
              const active = highlight === f.id
              return (
                <div key={f.id}
                  onPointerDown={e => onNodePointerDown(e, f.id)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  onClick={e => { e.stopPropagation(); setHighlight(h => h === f.id ? null : f.id) }}
                  style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`, transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:'.3rem', cursor:'grab', touchAction:'none', zIndex:3 }}
                >
                  <div style={{ width:60, height:60, borderRadius:'50%', background:'#0d2040', border:`2px solid ${active ? '#f0c040' : 'rgba(30,120,200,.4)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', boxShadow: active ? '0 0 16px rgba(240,192,64,.6)' : 'none' }}>
                    {f.emoji || '⚔️'}
                  </div>
                  <span style={{ fontSize:'.62rem', color:'#c8d8e8', fontFamily:"'Cinzel',serif", whiteSpace:'nowrap', background:'rgba(5,13,26,.75)', padding:'.1rem .4rem', borderRadius:4 }}>{f.nom}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Liste des relations */}
        {relations.length > 0 && (
          <div style={{ marginTop:'1.75rem' }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.14em', textTransform:'uppercase', color:'#00c8ff', marginBottom:'.75rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
              🔗 Relations enregistrées <div style={{ flex:1, height:1, background:'rgba(30,120,200,.2)' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {relations.map(r => {
                const rt = REL_TYPES[r.type] || REL_TYPES.neutre
                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'.75rem', background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:10, padding:'.7rem 1rem' }}>
                    <span style={{ background:`${rt.color}22`, color:rt.color, border:`1px solid ${rt.color}44`, borderRadius:100, padding:'.15rem .6rem', fontFamily:"'Cinzel',serif", fontSize:'.58rem', letterSpacing:'.08em', textTransform:'uppercase' }}>{rt.icon} {rt.label}</span>
                    <span style={{ flex:1, fontSize:'.9rem' }}>{r.faction_a} <span style={{ color:'#4a6880' }}>—</span> {r.faction_b}{r.note && <span style={{ color:'#7a9ab8', fontStyle:'italic' }}> · {r.note}</span>}</span>
                    <button onClick={() => openRelForm(r)} style={{ background:'rgba(0,200,255,.1)', border:'1px solid rgba(0,200,255,.25)', borderRadius:8, padding:'.2rem .5rem', color:'#00c8ff', cursor:'pointer', fontSize:'.7rem' }}>✏️</button>
                    <button onClick={() => deleteRelation(r.id)} style={{ background:'rgba(224,48,48,.1)', border:'1px solid rgba(224,48,48,.25)', borderRadius:8, padding:'.2rem .5rem', color:'#ff6060', cursor:'pointer', fontSize:'.7rem' }}>🗑</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showRelForm && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowRelForm(false) }}>
          <div style={S.modal}>
            <div style={{ padding:'1.35rem 1.75rem', borderBottom:'1px solid rgba(30,120,200,.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:'1.1rem', color:'#f0c040' }}>{relEditId ? '✏️ Modifier la relation' : '✚ Nouvelle relation'}</div>
              <button onClick={() => setShowRelForm(false)} style={{ background:'rgba(5,13,26,.75)', border:'1px solid rgba(30,120,200,.2)', color:'#7a9ab8', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:'.9rem' }}>✕</button>
            </div>
            <div style={{ padding:'1.75rem', display:'flex', flexDirection:'column', gap:'1.1rem' }}>
              <div>
                <label style={S.label}>Faction A</label>
                <select style={S.input} value={relForm.faction_a || ''} onChange={e => setRelForm(f => ({ ...f, faction_a: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {factions.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Faction B</label>
                <select style={S.input} value={relForm.faction_b || ''} onChange={e => setRelForm(f => ({ ...f, faction_b: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {factions.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Type de relation</label>
                <div style={{ display:'flex', gap:'.5rem' }}>
                  {Object.entries(REL_TYPES).map(([k, v]) => {
                    const active = (relForm.type || 'alliance') === k
                    return (
                      <button key={k} type="button" onClick={() => setRelForm(f => ({ ...f, type: k }))}
                        style={{ flex:1, background: active ? `${v.color}22` : '#0d2040', border:`1px solid ${active ? v.color : 'rgba(30,120,200,.2)'}`, borderRadius:10, padding:'.6rem', color: active ? v.color : '#7a9ab8', cursor:'pointer', fontFamily:"'Cinzel',serif", fontSize:'.7rem', letterSpacing:'.06em', textTransform:'uppercase' }}>
                        {v.icon} {v.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={S.label}>Note (optionnel)</label>
                <textarea style={{ ...S.input, minHeight:70, resize:'vertical' }} value={relForm.note || ''} onChange={e => setRelForm(f => ({ ...f, note: e.target.value }))} placeholder="Contexte de la relation..." />
              </div>
            </div>
            <div style={{ padding:'1.1rem 1.75rem', borderTop:'1px solid rgba(30,120,200,.2)', display:'flex', gap:'.65rem', justifyContent:'space-between' }}>
              {relEditId ? (
                <button onClick={() => { deleteRelation(relEditId); setShowRelForm(false) }} style={{ background:'rgba(224,48,48,.12)', color:'#ff6060', border:'1px solid rgba(224,48,48,.3)', borderRadius:10, padding:'.7rem 1.1rem', fontFamily:"'Cinzel',serif", fontSize:'.68rem', fontWeight:700, cursor:'pointer' }}>🗑 Supprimer</button>
              ) : <span />}
              <div style={{ display:'flex', gap:'.65rem' }}>
                <button style={S.btnCyan} onClick={() => setShowRelForm(false)}>Annuler</button>
                <button style={S.btnGold} onClick={saveRelation}>💾 Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
