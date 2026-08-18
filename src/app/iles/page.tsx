'use client'

import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Ile {
  id: string
  nom: string
  emoji?: string
  region?: string
  climat?: string
  faction?: string
  description?: string
  photo?: string
  gdoc?: string
  miro?: string
}

const REGIONS = ['East Blue', 'West Blue', 'North Blue', 'South Blue', 'Grand Line', 'New World', 'Red Line']
const REGION_COLORS: Record<string, string> = {
  'East Blue': '#00c8ff', 'West Blue': '#4488ff', 'North Blue': '#a060ff',
  'South Blue': '#40d060', 'Grand Line': '#d4a017', 'New World': '#e03030', 'Red Line': '#ff8c40'
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [factions, setFactions] = useState<{ id: string; nom: string; emoji?: string }[]>([])
  const [form, setForm] = useState<Partial<Ile>>({
    nom: '', emoji: '🏝️', region: 'Grand Line', climat: '', faction: '', description: '', gdoc: '', miro: ''
  })

  useEffect(() => {
    fetchList(); fetchFactions()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])
  useEffect(() => {
    let l = list
    if (search) l = l.filter(i => i.nom.toLowerCase().includes(search.toLowerCase()))
    if (regionFilter) l = l.filter(i => i.region === regionFilter)
    if (factionFilter) l = l.filter(i => i.faction === factionFilter)
    setFiltered(l)
  }, [list, search, regionFilter, factionFilter])

  async function fetchList() {
    const { data } = await supabase.from('iles').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchFactions() {
    const { data } = await supabase.from('factions').select('id, nom, emoji').order('nom', { ascending: true })
    setFactions(data || [])
  }

  function openForm(ile?: Ile) {
    if (ile) { setForm(ile); setEditId(ile.id); setPhotoPreview(ile.photo || '') }
    else { setForm({ nom: '', emoji: '🏝️', region: 'Grand Line', climat: '', faction: '', description: '', gdoc: '', miro: '' }); setEditId(null); setPhotoPreview('') }
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
    if (photoFile) photo = await uploadImage(photoFile, 'iles')
    const data = { ...form, photo }
    if (editId) await supabase.from('iles').update(data).eq('id', editId)
    else await supabase.from('iles').insert([data])
    setUploading(false)
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

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Despas','/despas'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Campagne','/campagne'],['Lore','/lore'],['Dashboard','/dashboard']]

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

      <div style={S.grid}>
        {filtered.length === 0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:'5rem 2rem',color:'#4a6880'}}>
            <div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.4}}>🏝️</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Aucune île</div>
            <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter la première</button>
          </div>
        )}
        {filtered.map(ile => {
          const rc = REGION_COLORS[ile.region||''] || '#00c8ff'
          return (
            <div key={ile.id} style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:14,overflow:'hidden',transition:'all .3s'}}
              onMouseEnter={e=>{const el=e.currentTarget;el.style.transform='translateY(-5px)';el.style.borderColor=rc;el.style.boxShadow=`0 18px 36px rgba(0,0,0,.4)`}}
              onMouseLeave={e=>{const el=e.currentTarget;el.style.transform='none';el.style.borderColor='rgba(30,120,200,.2)';el.style.boxShadow='none'}}>
              {/* Banner */}
              <div style={{height:155,background:'linear-gradient(135deg,#071828,#0d2440)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'4.5rem',overflow:'hidden'}}>
                {ile.photo && <img src={ile.photo} alt={ile.nom} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:.55}} />}
                <span style={{position:'relative',zIndex:1}}>{ile.emoji||'🏝️'}</span>
                <div style={{position:'absolute',top:'.6rem',right:'.6rem',background:`${rc}22`,border:`1px solid ${rc}44`,borderRadius:100,padding:'.2rem .6rem',fontFamily:"'Cinzel',serif",fontSize:'.52rem',letterSpacing:'.09em',textTransform:'uppercase',color:rc,zIndex:1}}>{ile.region}</div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:60,background:'linear-gradient(to top,#0d2040,transparent)'}} />
              </div>
              <div style={{padding:'1.1rem'}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.08rem',fontWeight:700,color:'#e8eef5',marginBottom:'.2rem'}}>{ile.nom}</div>
                {ile.climat && <div style={{fontSize:'.78rem',color:'#4a6880',marginBottom:'.6rem'}}>🌤 {ile.climat}</div>}
                {ile.faction && <a href={`/factions?q=${encodeURIComponent(ile.faction)}`} style={{display:'block',fontSize:'.78rem',color:'#f0c040',marginBottom:'.6rem',textDecoration:'none'}}>⚔️ {ile.faction}</a>}
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
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={S.modal}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{editId?'✏️ Modifier l\'Île':'✚ Nouvelle Île'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem'}}>✕</button>
            </div>
            <div style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.1rem'}}>
              {/* Photo */}
              <div>
                <label style={S.label}>🖼️ Image / Photo de l'île</label>
                <div style={{border:'2px dashed rgba(30,120,200,.3)',borderRadius:10,padding:'1.5rem',textAlign:'center',cursor:'pointer',background:'#0d2040',position:'relative'}}>
                  <input type="file" accept="image/*,.gif" style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} onChange={handlePhoto} />
                  {photoPreview
                    ? <img src={photoPreview} style={{maxWidth:'100%',maxHeight:160,objectFit:'cover',display:'block',margin:'0 auto',borderRadius:8}} />
                    : <><div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>🏝️</div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.65rem',letterSpacing:'.09em',textTransform:'uppercase',color:'#7a9ab8'}}>Clique ou glisse une image</div></>}
                </div>
                {photoPreview && <button onClick={()=>{setPhotoPreview('');setPhotoFile(null)}} style={{marginTop:'.5rem',background:'rgba(224,48,48,.12)',border:'1px solid rgba(224,48,48,.3)',borderRadius:8,padding:'.3rem .75rem',color:'#ff6060',cursor:'pointer',fontFamily:"'Cinzel',serif",fontSize:'.6rem'}}>✕ Supprimer</button>}
                <div style={{marginTop:'.65rem'}}>
                  <label style={{...S.label,color:'#7a9ab8'}}>Ou URL directe</label>
                  <input style={S.input} placeholder="https://i.imgur.com/exemple.jpg" onChange={e=>{if(e.target.value){setPhotoPreview(e.target.value);setForm(f=>({...f,photo:e.target.value}))}}} />
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
                <label style={S.label}>⚔️ Faction liée</label>
                <select style={{...S.input}} value={form.faction || ''} onChange={e => setForm(f => ({...f, faction: e.target.value}))}>
                  <option value="">— Aucune —</option>
                  {factions.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                </select>
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
    </div>
  )
}
