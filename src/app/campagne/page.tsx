'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Session {
  id: string
  num?: number
  titre: string
  date?: string
  lieu?: string
  resume?: string
  gdoc?: string
  miro?: string
}

const S = {
  page: { minHeight:'100vh', background:'#050d1a', color:'#e8eef5', fontFamily:"'Crimson Pro',Georgia,serif", paddingTop:60 } as React.CSSProperties,
  nav: { position:'fixed' as const, top:0, left:0, right:0, zIndex:50, height:60, background:'rgba(5,13,26,.93)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(30,120,200,.2)', display:'flex', alignItems:'center', padding:'0 2rem', gap:'1rem' },
  logo: { fontFamily:"'Cinzel Decorative',serif", fontSize:'1rem', fontWeight:900, background:'linear-gradient(135deg,#f0c040,#d4a017)', WebkitBackgroundClip:'text' as const, WebkitTextFillColor:'transparent' as const, textDecoration:'none', display:'flex', alignItems:'center', gap:'.5rem' },
  btnGold: { background:'linear-gradient(135deg,#d4a017,#b8860b)', color:'#050d1a', border:'none', borderRadius:10, padding:'.7rem 1.4rem', fontFamily:"'Cinzel',serif", fontSize:'.72rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, cursor:'pointer' },
  btnCyan: { background:'rgba(0,200,255,.12)', color:'#00c8ff', border:'1px solid rgba(0,200,255,.3)', borderRadius:10, padding:'.7rem 1.4rem', fontFamily:"'Cinzel',serif", fontSize:'.72rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, cursor:'pointer' },
  input: { width:'100%', background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:9, padding:'.65rem .9rem', color:'#e8eef5', fontFamily:"'Crimson Pro',serif", fontSize:'.95rem', outline:'none' },
  label: { fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.11em', textTransform:'uppercase' as const, color:'#4a6880', marginBottom:'.4rem', display:'block' },
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,.88)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
  modal: { background:'#0a1829', border:'1px solid rgba(30,180,255,.4)', borderRadius:18, maxWidth:600, width:'100%', maxHeight:'90vh', overflowY:'auto' as const, boxShadow:'0 40px 80px rgba(0,0,0,.8)' },
}

export default function CampagnePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState<Partial<Session>>({ num:1, titre:'', date:'', lieu:'', resume:'', gdoc:'', miro:'' })

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    const { data } = await supabase.from('sessions').select('*').order('num', { ascending: true })
    setSessions(data || [])
  }

  function openForm(s?: Session) {
    if (s) { setForm(s); setEditId(s.id) }
    else { setForm({ num:(sessions.length+1), titre:'', date:'', lieu:'', resume:'', gdoc:'', miro:'' }); setEditId(null) }
    setShowForm(true)
  }

  async function saveForm() {
    if (!form.titre?.trim()) { alert('Le titre est obligatoire !'); return }
    if (editId) await supabase.from('sessions').update(form).eq('id', editId)
    else await supabase.from('sessions').insert([form])
    setShowForm(false); fetchSessions()
  }

  async function deleteSession(id: string) {
    if (!confirm('Supprimer cette session ?')) return
    await supabase.from('sessions').delete().eq('id', id); fetchSessions()
  }

  function formatDate(d?: string) {
    if (!d) return ''
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
  }

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Despas','/despas'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Campagne','/campagne'],['Lore','/lore'],['Dashboard','/dashboard']]

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d4a017;border-radius:3px}`}</style>
      <nav style={S.nav}>
        <a href="/" style={S.logo}><span style={{width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>☠</span>Grand Line</a>
        <div style={{flex:1,display:'flex',gap:'.3rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {navLinks.map(([l,h]) => <a key={h} href={h} style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.06em',textTransform:'uppercase',color:h==='/campagne'?'#f0c040':'#7a9ab8',textDecoration:'none',padding:'.38rem .6rem',borderRadius:6,whiteSpace:'nowrap',background:h==='/campagne'?'rgba(212,160,23,.15)':'none'}}>{l}</a>)}
        </div>
        <a href="/dashboard" style={{...S.btnGold,padding:'.38rem .85rem',textDecoration:'none',fontSize:'.62rem'}}>⚓ MJ</a>
      </nav>

      <div style={{padding:'2.5rem 2rem 1.5rem',maxWidth:900,margin:'0 auto'}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.1em',color:'#7a9ab8',textTransform:'uppercase',marginBottom:'.4rem'}}>🏴‍☠️ › Campagne</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:700,background:'linear-gradient(135deg,#fff,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Journal de Campagne</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Nouvelle session</button>
        </div>
        <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:12,padding:'1.1rem 1.35rem',display:'flex',gap:'2rem',flexWrap:'wrap',alignItems:'center',marginBottom:'1.5rem'}}>
          <div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#4a6880',marginBottom:'.25rem'}}>Campagne</div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#f0c040'}}>La Route du One Piece</div></div>
          <div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#4a6880',marginBottom:'.25rem'}}>Sessions</div><div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.4rem',fontWeight:900,color:'#f0c040'}}>{sessions.length}</div></div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 2rem 4rem',position:'relative'}}>
        <div style={{position:'absolute',left:'calc(2rem + 21px)',top:0,bottom:0,width:2,background:'linear-gradient(to bottom,#d4a017,#00c8ff,transparent)',opacity:.25}} />
        {sessions.length === 0 && (
          <div style={{textAlign:'center',padding:'5rem 2rem',color:'#4a6880'}}>
            <div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.4}}>📜</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Aucune session</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Créer la première session</button>
          </div>
        )}
        {sessions.map(s => (
          <div key={s.id} style={{display:'flex',gap:'1.25rem',marginBottom:'1.75rem',position:'relative'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:'#0d2040',border:'2px solid #d4a017',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel Decorative',serif",fontSize:'.85rem',fontWeight:700,color:'#f0c040',flexShrink:0,boxShadow:'0 0 14px rgba(212,160,23,.2)',zIndex:1}}>{s.num||'?'}</div>
            <div style={{flex:1,background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:12,padding:'1.1rem',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#d4a017';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.3)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(30,120,200,.2)';e.currentTarget.style.boxShadow='none'}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.35rem'}}>📅 {formatDate(s.date)} {s.lieu?`· ${s.lieu}`:''}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#e8eef5',marginBottom:'.45rem'}}>{s.titre}</div>
              {s.resume && <div style={{fontSize:'.88rem',color:'#7a9ab8',fontStyle:'italic',lineHeight:1.6,marginBottom:'.65rem'}}>{s.resume}</div>}
              <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center'}}>
                {s.gdoc && <a href={s.gdoc} target="_blank" rel="noopener" style={{background:'rgba(66,133,244,.12)',color:'#6aabff',border:'1px solid rgba(66,133,244,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>📄 Google Doc</a>}
                {s.miro && <a href={s.miro} target="_blank" rel="noopener" style={{background:'rgba(255,196,0,.1)',color:'#ffc400',border:'1px solid rgba(255,196,0,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>🗒 Miro</a>}
                <div style={{marginLeft:'auto',display:'flex',gap:'.3rem'}}>
                  <button onClick={() => openForm(s)} style={{background:'rgba(0,200,255,.1)',border:'1px solid rgba(0,200,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#00c8ff',cursor:'pointer',fontSize:'.7rem'}}>✏️</button>
                  <button onClick={() => deleteSession(s.id)} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem'}}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={S.modal}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{editId?'✏️ Modifier la Session':'✚ Nouvelle Session'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem'}}>✕</button>
            </div>
            <div style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.1rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'.85rem'}}>
                <div><label style={S.label}>N° Session</label><input style={{...S.input,width:80}} type="number" min="1" value={form.num||1} onChange={e=>setForm(f=>({...f,num:parseInt(e.target.value)}))} /></div>
                <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date||''} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
              </div>
              <div><label style={S.label}>Titre *</label><input style={S.input} value={form.titre||''} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="L'Appel du Large" /></div>
              <div><label style={S.label}>Lieu / Île</label><input style={S.input} value={form.lieu||''} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))} placeholder="Port Crimson" /></div>
              <div><label style={S.label}>Résumé</label><textarea style={{...S.input,minHeight:120,resize:'vertical',lineHeight:1.7}} value={form.resume||''} onChange={e=>setForm(f=>({...f,resume:e.target.value}))} placeholder="Ce qui s'est passé pendant cette session..." /></div>
              <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'1.1rem'}}>
                <div style={{...S.label,marginBottom:'.75rem'}}>🔗 Liens</div>
                <div style={{marginBottom:'.65rem'}}><label style={{...S.label,color:'#7a9ab8'}}>📄 Google Doc (compte-rendu)</label><input style={S.input} value={form.gdoc||''} onChange={e=>setForm(f=>({...f,gdoc:e.target.value}))} placeholder="https://docs.google.com/..." /></div>
                <div><label style={{...S.label,color:'#7a9ab8'}}>🗒 Miro (carte, timeline)</label><input style={S.input} value={form.miro||''} onChange={e=>setForm(f=>({...f,miro:e.target.value}))} placeholder="https://miro.com/..." /></div>
              </div>
            </div>
            <div style={{padding:'1.1rem 1.75rem',borderTop:'1px solid rgba(30,120,200,.2)',display:'flex',gap:'.65rem',justifyContent:'flex-end',position:'sticky',bottom:0,background:'#0a1829',borderRadius:'0 0 18px 18px'}}>
              <button style={S.btnCyan} onClick={()=>setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
