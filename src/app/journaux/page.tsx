'use client'
import { useEffect, useState } from 'react'
import { supabase, uploadImage } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Pdf { nom: string; url: string }

interface Journal {
  id: string
  num?: number
  titre: string
  date?: string
  lieu?: string
  resume?: string
  photos?: string[]
  pdfs?: Pdf[]
  personnages?: string[]
  gdoc?: string
  miro?: string
}

type SortMode = 'num' | 'date' | 'date-desc'

function sortJournaux(items: Journal[], mode: SortMode) {
  return items.slice().sort((a, b) => {
    if (mode === 'date') return (a.date || '').localeCompare(b.date || '')
    if (mode === 'date-desc') return (b.date || '').localeCompare(a.date || '')
    return (a.num || 0) - (b.num || 0)
  })
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

export default function JournauxPage() {
  const [journaux, setJournaux] = useState<Journal[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('num')
  const [personnageFilter, setPersonnageFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [personnages, setPersonnages] = useState<{ id: string; nom: string }[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [form, setForm] = useState<Partial<Journal>>({ num:1, titre:'', date:'', lieu:'', resume:'', photos:[], pdfs:[], personnages:[], gdoc:'', miro:'' })
  const [consult, setConsult] = useState<Journal | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  let filtered = journaux
  if (search) filtered = filtered.filter(j => j.titre.toLowerCase().includes(search.toLowerCase()) || (j.resume||'').toLowerCase().includes(search.toLowerCase()))
  if (personnageFilter) filtered = filtered.filter(j => j.personnages?.includes(personnageFilter))
  filtered = sortJournaux(filtered, sortMode)

  useEffect(() => {
    fetchJournaux(); fetchPersonnages()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])

  async function fetchJournaux() {
    const { data } = await supabase.from('sessions').select('*').order('num', { ascending: true })
    setJournaux(data || [])
  }

  async function fetchPersonnages() {
    const { data } = await supabase.from('personnages').select('id, nom').order('nom', { ascending: true })
    setPersonnages(data || [])
  }

  const personnageMap = new Map(personnages.map(p => [p.nom, p.id]))

  function openForm(j?: Journal) {
    if (j) { setForm({ ...j, photos: j.photos || [], pdfs: j.pdfs || [], personnages: j.personnages || [] }); setEditId(j.id) }
    else { setForm({ num:(journaux.length+1), titre:'', date:'', lieu:'', resume:'', photos:[], pdfs:[], personnages:[], gdoc:'', miro:'' }); setEditId(null) }
    setPhotoFiles([]); setPhotoPreviews([]); setPdfFiles([])
    setShowForm(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setPhotoFiles(prev => [...prev, ...files])
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setPdfFiles(prev => [...prev, ...files])
  }

  async function saveForm() {
    if (!form.titre?.trim()) { alert('Le titre est obligatoire !'); return }
    setUploading(true)
    let photos = form.photos || []
    for (const file of photoFiles) {
      const url = await uploadImage(file, 'journaux')
      if (url) photos = [...photos, url]
    }
    let pdfs = form.pdfs || []
    for (const file of pdfFiles) {
      const url = await uploadImage(file, 'journaux')
      if (url) pdfs = [...pdfs, { nom: file.name, url }]
    }
    const data = { ...form, photos, pdfs }
    if (editId) await supabase.from('sessions').update(data).eq('id', editId)
    else await supabase.from('sessions').insert([data])
    setUploading(false); setShowForm(false); fetchJournaux()
  }

  async function deleteJournal(id: string) {
    if (!confirm('Supprimer ce journal ?')) return
    await supabase.from('sessions').delete().eq('id', id)
    setConsult(null)
    fetchJournaux()
  }

  async function duplicateJournal(j: Journal) {
    const { id, ...rest } = j
    void id
    await supabase.from('sessions').insert([{ ...rest, titre: rest.titre + ' (copie)', num: journaux.length + 1 }])
    fetchJournaux()
  }

  function formatDate(d?: string) {
    if (!d) return ''
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
  }

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Despas','/despas'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Journaux','/journaux'],['Lore','/lore'],['Dashboard','/dashboard']]

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d4a017;border-radius:3px}`}</style>
      <nav style={S.nav}>
        <a href="/" style={S.logo}><span style={{width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>☠</span>Grand Line</a>
        <div style={{flex:1,display:'flex',gap:'.3rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {navLinks.map(([l,h]) => <a key={h} href={h} style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.06em',textTransform:'uppercase',color:h==='/journaux'?'#f0c040':'#7a9ab8',textDecoration:'none',padding:'.38rem .6rem',borderRadius:6,whiteSpace:'nowrap',background:h==='/journaux'?'rgba(212,160,23,.15)':'none'}}>{l}</a>)}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{...S.btnGold,padding:'.38rem .85rem',textDecoration:'none',fontSize:'.62rem'}}>⚓ MJ</a>
      </nav>

      <div style={{padding:'2.5rem 2rem 1.5rem',maxWidth:900,margin:'0 auto'}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.1em',color:'#7a9ab8',textTransform:'uppercase',marginBottom:'.4rem'}}>🏴‍☠️ › Journaux</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:700,background:'linear-gradient(135deg,#fff,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>📜 Journaux</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Nouveau journal</button>
        </div>
        <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:12,padding:'1.1rem 1.35rem',display:'flex',gap:'2rem',flexWrap:'wrap',alignItems:'center',marginBottom:'1.5rem'}}>
          <div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#4a6880',marginBottom:'.25rem'}}>Campagne</div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#f0c040'}}>La Route du One Piece</div></div>
          <div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#4a6880',marginBottom:'.25rem'}}>Journaux</div><div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.4rem',fontWeight:900,color:'#f0c040'}}>{journaux.length}</div></div>
        </div>
        <div style={{display:'flex',gap:'.65rem',marginBottom:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220,position:'relative'}}>
            <span style={{position:'absolute',left:'.75rem',top:'50%',transform:'translateY(-50%)',color:'#4a6880'}}>🔍</span>
            <input style={{...S.input,paddingLeft:'2.5rem'}} placeholder="Rechercher un journal..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{display:'flex',gap:'.3rem',alignItems:'center'}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#4a6880'}}>Trier :</span>
            {([['num','N° Session'],['date','Date ↑'],['date-desc','Date ↓']] as [SortMode,string][]).map(([mode,label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} style={{background:sortMode===mode?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${sortMode===mode?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .7rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.05em',color:sortMode===mode?'#f0c040':'#7a9ab8',cursor:'pointer',whiteSpace:'nowrap'}}>{label}</button>
            ))}
          </div>
        </div>
        {personnages.length > 0 && (
          <div style={{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#4a6880'}}>Personnage :</span>
            <select style={{...S.input,width:'auto',padding:'.35rem .7rem',fontSize:'.8rem'}} value={personnageFilter} onChange={e => setPersonnageFilter(e.target.value)}>
              <option value="">Tous</option>
              {personnages.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 2rem 4rem',position:'relative'}}>
        <div style={{position:'absolute',left:'calc(2rem + 21px)',top:0,bottom:0,width:2,background:'linear-gradient(to bottom,#d4a017,#00c8ff,transparent)',opacity:.25}} />
        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'5rem 2rem',color:'#4a6880'}}>
            <div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.4}}>📜</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>{journaux.length === 0 ? 'Aucun journal' : 'Aucun résultat'}</div>
            {journaux.length === 0 && <button style={S.btnGold} onClick={() => openForm()}>＋ Créer le premier journal</button>}
          </div>
        )}
        {filtered.map(j => (
          <div key={j.id} style={{display:'flex',gap:'1.25rem',marginBottom:'1.75rem',position:'relative'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:'#0d2040',border:'2px solid #d4a017',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel Decorative',serif",fontSize:'.85rem',fontWeight:700,color:'#f0c040',flexShrink:0,boxShadow:'0 0 14px rgba(212,160,23,.2)',zIndex:1}}>{j.num||'?'}</div>
            <div style={{flex:1,background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:12,padding:'1.1rem',transition:'all .2s',cursor:'pointer'}}
              onClick={() => setConsult(j)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#d4a017';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.3)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(30,120,200,.2)';e.currentTarget.style.boxShadow='none'}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.35rem'}}>📅 {formatDate(j.date)} {j.lieu?`· ${j.lieu}`:''}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#e8eef5',marginBottom:'.45rem'}}>{j.titre}</div>
              {j.resume && <div style={{fontSize:'.88rem',color:'#7a9ab8',fontStyle:'italic',lineHeight:1.6,marginBottom:'.65rem',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>{j.resume}</div>}

              {j.photos && j.photos.length > 0 && (
                <div style={{display:'flex',gap:'.4rem',marginBottom:'.65rem'}}>
                  {j.photos.slice(0,4).map((ph,i) => (
                    <div key={i} onClick={e => { e.stopPropagation(); setLightbox(ph) }} style={{width:52,height:52,borderRadius:6,overflow:'hidden',border:'1px solid rgba(30,120,200,.2)',flexShrink:0}}>
                      <img src={ph} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                    </div>
                  ))}
                  {j.photos.length > 4 && <div style={{width:52,height:52,borderRadius:6,background:'#071828',display:'flex',alignItems:'center',justifyContent:'center',color:'#7a9ab8',fontSize:'.75rem',fontFamily:"'Cinzel',serif"}}>+{j.photos.length-4}</div>}
                </div>
              )}

              {(j.personnages && j.personnages.length > 0) && (
                <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.65rem'}}>
                  {j.personnages.map(pn => (
                    <a key={pn} href={personnageMap.has(pn) ? `/personnages?open=${personnageMap.get(pn)}` : `/personnages?q=${encodeURIComponent(pn)}`} onClick={e => e.stopPropagation()} style={{background:'rgba(0,200,255,.1)',border:'1px solid rgba(0,200,255,.25)',borderRadius:100,padding:'.15rem .55rem',fontFamily:"'Cinzel',serif",fontSize:'.55rem',color:'#00c8ff',textDecoration:'none'}}>👤 {pn}</a>
                  ))}
                </div>
              )}

              <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center'}}>
                {j.pdfs && j.pdfs.length > 0 && <span style={{background:'rgba(212,160,23,.12)',color:'#d4a017',border:'1px solid rgba(212,160,23,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem'}}>📎 {j.pdfs.length} PDF</span>}
                {j.gdoc && <a href={j.gdoc} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{background:'rgba(66,133,244,.12)',color:'#6aabff',border:'1px solid rgba(66,133,244,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>📄 Google Doc</a>}
                {j.miro && <a href={j.miro} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{background:'rgba(255,196,0,.1)',color:'#ffc400',border:'1px solid rgba(255,196,0,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>🗒 Miro</a>}
                <div style={{marginLeft:'auto',display:'flex',gap:'.3rem'}}>
                  <button onClick={e => { e.stopPropagation(); setConsult(j) }} title="Consulter" style={{background:'rgba(64,208,96,.1)',border:'1px solid rgba(64,208,96,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#40d060',cursor:'pointer',fontSize:'.7rem'}}>👁</button>
                  <button onClick={e => { e.stopPropagation(); duplicateJournal(j) }} title="Dupliquer" style={{background:'rgba(160,96,255,.1)',border:'1px solid rgba(160,96,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#a060ff',cursor:'pointer',fontSize:'.7rem'}}>⧉</button>
                  <button onClick={e => { e.stopPropagation(); openForm(j) }} style={{background:'rgba(0,200,255,.1)',border:'1px solid rgba(0,200,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#00c8ff',cursor:'pointer',fontSize:'.7rem'}}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); deleteJournal(j.id) }} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem'}}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== FORM MODAL ===== */}
      {showForm && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={S.modal}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{editId?'✏️ Modifier le Journal':'✚ Nouveau Journal'}</div>
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

              {/* Personnages liés */}
              <div>
                <label style={S.label}>👤 Personnages liés</label>
                {personnages.length === 0 && <div style={{fontSize:'.8rem',color:'#4a6880',fontStyle:'italic'}}>Aucun personnage créé pour l&apos;instant.</div>}
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                  {personnages.map(p => {
                    const active = (form.personnages || []).includes(p.nom)
                    return (
                      <button key={p.id} type="button" onClick={() => setForm(f => {
                        const current = f.personnages || []
                        return { ...f, personnages: active ? current.filter(n => n !== p.nom) : [...current, p.nom] }
                      })} style={{background:active?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${active?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.35rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',color:active?'#f0c040':'#7a9ab8',cursor:'pointer'}}>
                        {active?'✓ ':''}{p.nom}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label style={S.label}>📸 Photos</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.6rem',marginBottom:'.65rem'}}>
                  {(form.photos || []).map((src,i) => (
                    <div key={`existing-${i}`} style={{aspectRatio:'1',borderRadius:8,overflow:'hidden',position:'relative',border:'1px solid rgba(30,120,200,.2)'}}>
                      <img src={src} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      <button onClick={() => setForm(f => ({...f, photos: (f.photos||[]).filter((_,j) => j!==i)}))} style={{position:'absolute',top:2,right:2,background:'rgba(224,48,48,.85)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',fontSize:'.6rem',cursor:'pointer'}}>✕</button>
                    </div>
                  ))}
                  {photoPreviews.map((src,i) => (
                    <div key={`new-${i}`} style={{aspectRatio:'1',borderRadius:8,overflow:'hidden',position:'relative',border:'2px solid #d4a017'}}>
                      <img src={src} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      <button onClick={() => { setPhotoPreviews(p => p.filter((_,j) => j!==i)); setPhotoFiles(p => p.filter((_,j) => j!==i)) }} style={{position:'absolute',top:2,right:2,background:'rgba(224,48,48,.85)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',fontSize:'.6rem',cursor:'pointer'}}>✕</button>
                    </div>
                  ))}
                  <label style={{aspectRatio:'1',borderRadius:8,border:'2px dashed rgba(30,120,200,.3)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'#0d2040',color:'#4a6880',fontSize:'.6rem',gap:'.3rem'}}>
                    <input type="file" accept="image/*,.gif" multiple style={{display:'none'}} onChange={handlePhotoChange} />
                    <span style={{fontSize:'1.5rem'}}>➕</span><span>Photo</span>
                  </label>
                </div>
              </div>

              {/* PDFs */}
              <div>
                <label style={S.label}>📎 PDFs</label>
                <div style={{display:'flex',flexDirection:'column',gap:'.4rem',marginBottom:'.5rem'}}>
                  {(form.pdfs || []).map((pdf,i) => (
                    <div key={`existing-${i}`} style={{display:'flex',alignItems:'center',gap:'.5rem',background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:8,padding:'.5rem .75rem'}}>
                      <span>📄</span>
                      <a href={pdf.url} target="_blank" rel="noopener" style={{flex:1,color:'#00c8ff',fontSize:'.82rem',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pdf.nom}</a>
                      <button onClick={() => setForm(f => ({...f, pdfs: (f.pdfs||[]).filter((_,j) => j!==i)}))} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:6,padding:'.15rem .4rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem'}}>✕</button>
                    </div>
                  ))}
                  {pdfFiles.map((file,i) => (
                    <div key={`new-${i}`} style={{display:'flex',alignItems:'center',gap:'.5rem',background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.3)',borderRadius:8,padding:'.5rem .75rem'}}>
                      <span>📄</span>
                      <span style={{flex:1,color:'#f0c040',fontSize:'.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</span>
                      <button onClick={() => setPdfFiles(p => p.filter((_,j) => j!==i))} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:6,padding:'.15rem .4rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem'}}>✕</button>
                    </div>
                  ))}
                </div>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',border:'2px dashed rgba(30,120,200,.3)',borderRadius:8,padding:'.65rem',cursor:'pointer',background:'#0d2040',color:'#7a9ab8',fontSize:'.75rem'}}>
                  <input type="file" accept="application/pdf" multiple style={{display:'none'}} onChange={handlePdfChange} />
                  ➕ Ajouter un PDF
                </label>
              </div>

              <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'1.1rem'}}>
                <div style={{...S.label,marginBottom:'.75rem'}}>🔗 Liens</div>
                <div style={{marginBottom:'.65rem'}}><label style={{...S.label,color:'#7a9ab8'}}>📄 Google Doc (compte-rendu)</label><input style={S.input} value={form.gdoc||''} onChange={e=>setForm(f=>({...f,gdoc:e.target.value}))} placeholder="https://docs.google.com/..." /></div>
                <div><label style={{...S.label,color:'#7a9ab8'}}>🗒 Miro (carte, timeline)</label><input style={S.input} value={form.miro||''} onChange={e=>setForm(f=>({...f,miro:e.target.value}))} placeholder="https://miro.com/..." /></div>
              </div>
            </div>
            <div style={{padding:'1.1rem 1.75rem',borderTop:'1px solid rgba(30,120,200,.2)',display:'flex',gap:'.65rem',justifyContent:'flex-end',position:'sticky',bottom:0,background:'#0a1829',borderRadius:'0 0 18px 18px'}}>
              <button style={S.btnCyan} onClick={()=>setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm} disabled={uploading}>{uploading?'⏳ Upload...':'💾 Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONSULT MODAL ===== */}
      {consult && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setConsult(null)}}>
          <div style={{...S.modal, maxWidth:760}}>
            <div style={{position:'relative',height:consult.photos && consult.photos[0] ? 220 : 100,background:'linear-gradient(135deg,#071828,#0d2440)',borderRadius:'18px 18px 0 0',overflow:'hidden',display:'flex',alignItems:'flex-end',padding:'1.5rem'}}>
              {consult.photos && consult.photos[0] && <img src={consult.photos[0]} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.5,display:'block'}} />}
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:90,background:'linear-gradient(to top,#0a1829,transparent)'}} />
              <button onClick={()=>setConsult(null)} style={{position:'absolute',top:'.9rem',right:'.9rem',background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem',zIndex:5}}>✕</button>
              <div style={{position:'relative',zIndex:2}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.11em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.35rem'}}>Session {consult.num} · 📅 {formatDate(consult.date)} {consult.lieu?`· ${consult.lieu}`:''}</div>
                <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.5rem',fontWeight:700,color:'#fff'}}>{consult.titre}</div>
              </div>
            </div>
            <div style={{padding:'1.75rem'}}>
              {consult.resume && <p style={{fontSize:'1rem',color:'#c8d8e8',lineHeight:1.85,marginBottom:'1.5rem',whiteSpace:'pre-wrap'}}>{consult.resume}</p>}

              {consult.personnages && consult.personnages.length > 0 && (
                <>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.68rem',letterSpacing:'.13em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:'.5rem'}}>👤 Personnages <div style={{flex:1,height:1,background:'rgba(30,120,200,.2)'}} /></div>
                  <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
                    {consult.personnages.map(pn => (
                      <a key={pn} href={personnageMap.has(pn) ? `/personnages?open=${personnageMap.get(pn)}` : `/personnages?q=${encodeURIComponent(pn)}`} style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:100,padding:'.4rem .85rem',color:'#c8d8e8',textDecoration:'none',fontSize:'.82rem'}}>👤 {pn}</a>
                    ))}
                  </div>
                </>
              )}

              {consult.photos && consult.photos.length > 0 && (
                <>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.68rem',letterSpacing:'.13em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:'.5rem'}}>📸 Galerie ({consult.photos.length}) <div style={{flex:1,height:1,background:'rgba(30,120,200,.2)'}} /></div>
                  <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
                    {consult.photos.map((ph,i) => (
                      <div key={i} onClick={() => setLightbox(ph)} style={{width:90,height:90,borderRadius:8,overflow:'hidden',border:'1px solid rgba(30,120,200,.2)',cursor:'pointer'}}>
                        <img src={ph} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {consult.pdfs && consult.pdfs.length > 0 && (
                <>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.68rem',letterSpacing:'.13em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:'.5rem'}}>📎 Documents PDF <div style={{flex:1,height:1,background:'rgba(30,120,200,.2)'}} /></div>
                  <div style={{display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'1.5rem'}}>
                    {consult.pdfs.map((pdf,i) => (
                      <a key={i} href={pdf.url} target="_blank" rel="noopener" style={{display:'flex',alignItems:'center',gap:'.6rem',background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'.75rem 1rem',color:'#e8eef5',textDecoration:'none'}}>
                        <span style={{fontSize:'1.3rem'}}>📄</span><span style={{flex:1,fontSize:'.9rem'}}>{pdf.nom}</span><span style={{color:'#4a6880',fontSize:'.7rem'}}>Ouvrir ↗</span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              <div style={{display:'flex',gap:'.65rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
                {consult.gdoc && <a href={consult.gdoc} target="_blank" rel="noopener" style={{background:'rgba(66,133,244,.15)',color:'#6aabff',border:'1px solid rgba(66,133,244,.3)',borderRadius:9,padding:'.55rem .95rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',textDecoration:'none'}}>📄 Google Doc</a>}
                {consult.miro && <a href={consult.miro} target="_blank" rel="noopener" style={{background:'rgba(255,196,0,.12)',color:'#ffc400',border:'1px solid rgba(255,196,0,.3)',borderRadius:9,padding:'.55rem .95rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',textDecoration:'none'}}>🗒 Miro</a>}
              </div>

              <div style={{display:'flex',gap:'.65rem',justifyContent:'flex-end',paddingTop:'1.1rem',borderTop:'1px solid rgba(30,120,200,.2)'}}>
                <button style={{background:'rgba(224,48,48,.12)',color:'#ff6060',border:'1px solid rgba(224,48,48,.3)',borderRadius:8,padding:'.45rem .9rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',fontWeight:700,letterSpacing:'.07em',cursor:'pointer'}} onClick={() => deleteJournal(consult.id)}>🗑 Supprimer</button>
                <button style={{background:'rgba(0,200,255,.12)',color:'#00c8ff',border:'1px solid rgba(0,200,255,.3)',borderRadius:8,padding:'.45rem .9rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',fontWeight:700,letterSpacing:'.07em',cursor:'pointer'}} onClick={() => { setConsult(null); openForm(consult) }}>✏️ Modifier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightbox && (
        <div style={{...S.overlay, zIndex:300}} onClick={() => setLightbox(null)}>
          <img src={lightbox} style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:8,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}} />
        </div>
      )}
    </div>
  )
}
