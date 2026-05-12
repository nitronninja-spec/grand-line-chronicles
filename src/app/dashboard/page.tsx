'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface LoreArticle {
  id: string
  titre: string
  categorie?: string
  contenu?: string
  emoji?: string
  tags?: string
  modifie?: string
}

const CATS = [
  { id:'histoire', label:'📜 Histoire', color:'#d4a017' },
  { id:'geographie', label:'🌍 Géographie', color:'#00c8ff' },
  { id:'magie', label:'✨ Magie', color:'#a060ff' },
  { id:'personnage', label:'👤 Personnage', color:'#40d060' },
  { id:'faction', label:'⚔️ Faction', color:'#e03030' },
  { id:'divers', label:'📌 Divers', color:'#7a9ab8' },
]

const S = {
  page: { minHeight:'100vh', background:'#050d1a', color:'#e8eef5', fontFamily:"'Crimson Pro',Georgia,serif", paddingTop:60 } as React.CSSProperties,
  nav: { position:'fixed' as const, top:0, left:0, right:0, zIndex:50, height:60, background:'rgba(5,13,26,.93)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(30,120,200,.2)', display:'flex', alignItems:'center', padding:'0 2rem', gap:'1rem' },
  logo: { fontFamily:"'Cinzel Decorative',serif", fontSize:'1rem', fontWeight:900, background:'linear-gradient(135deg,#f0c040,#d4a017)', WebkitBackgroundClip:'text' as const, WebkitTextFillColor:'transparent' as const, textDecoration:'none', display:'flex', alignItems:'center', gap:'.5rem' },
  btnGold: { background:'linear-gradient(135deg,#d4a017,#b8860b)', color:'#050d1a', border:'none', borderRadius:10, padding:'.7rem 1.4rem', fontFamily:"'Cinzel',serif", fontSize:'.72rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, cursor:'pointer' },
  btnCyan: { background:'rgba(0,200,255,.12)', color:'#00c8ff', border:'1px solid rgba(0,200,255,.3)', borderRadius:10, padding:'.7rem 1.4rem', fontFamily:"'Cinzel',serif", fontSize:'.72rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, cursor:'pointer' },
  input: { width:'100%', background:'#0d2040', border:'1px solid rgba(30,120,200,.2)', borderRadius:9, padding:'.65rem .9rem', color:'#e8eef5', fontFamily:"'Crimson Pro',serif", fontSize:'.95rem', outline:'none' },
  label: { fontFamily:"'Cinzel',serif", fontSize:'.6rem', letterSpacing:'.11em', textTransform:'uppercase' as const, color:'#4a6880', marginBottom:'.4rem', display:'block' },
}

export default function LorePage() {
  const [articles, setArticles] = useState<LoreArticle[]>([])
  const [selected, setSelected] = useState<LoreArticle|null>(null)
  const [catFilter, setCatFilter] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<LoreArticle>>({ titre:'', categorie:'divers', contenu:'', emoji:'📄', tags:'' })
  const [saving, setSaving] = useState(false)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    const { data } = await supabase.from('lore').select('*').order('modifie', { ascending: false })
    setArticles(data || [])
  }

  function newArticle() {
    const a = { titre:'Nouvel article', categorie:'divers', contenu:'', emoji:'📄', tags:'' }
    setForm(a); setSelected(null); setEditing(true)
  }

  function selectArticle(a: LoreArticle) {
    setSelected(a); setForm(a); setEditing(false)
  }

  async function saveArticle() {
    if (!form.titre?.trim()) return
    setSaving(true)
    const data = { ...form, modifie: new Date().toISOString() }
    if (selected) {
      await supabase.from('lore').update(data).eq('id', selected.id)
    } else {
      const { data: inserted } = await supabase.from('lore').insert([data]).select().single()
      if (inserted) setSelected(inserted)
    }
    setSaving(false)
    fetchArticles()
  }

  function handleContentChange(val: string) {
    setForm(f => ({ ...f, contenu: val }))
    if (saveTimer) clearTimeout(saveTimer)
    const t = setTimeout(() => saveArticle(), 1500)
    setSaveTimer(t)
  }

  async function deleteArticle(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('lore').delete().eq('id', id)
    setSelected(null); setEditing(false); fetchArticles()
  }

  const filtered = catFilter ? articles.filter(a => a.categorie === catFilter) : articles
  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Îles','/iles'],['Factions','/factions'],['Campagne','/campagne'],['Lore','/lore'],['Dashboard','/dashboard']]

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d4a017;border-radius:3px}textarea:focus,input:focus,select:focus{border-color:#d4a017!important;outline:none}`}</style>
      <nav style={S.nav}>
        <a href="/" style={S.logo}><span style={{width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>☠</span>Grand Line</a>
        <div style={{flex:1,display:'flex',gap:'.3rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {navLinks.map(([l,h]) => <a key={h} href={h} style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.06em',textTransform:'uppercase',color:h==='/lore'?'#f0c040':'#7a9ab8',textDecoration:'none',padding:'.38rem .6rem',borderRadius:6,whiteSpace:'nowrap',background:h==='/lore'?'rgba(212,160,23,.15)':'none'}}>{l}</a>)}
        </div>
        <a href="/dashboard" style={{...S.btnGold,padding:'.38rem .85rem',textDecoration:'none',fontSize:'.62rem'}}>⚓ MJ</a>
      </nav>

      <div style={{padding:'2.5rem 2rem 1.5rem',maxWidth:1400,margin:'0 auto'}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.1em',color:'#7a9ab8',textTransform:'uppercase',marginBottom:'.4rem'}}>🏴‍☠️ › Lore & Encyclopédie</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:700,background:'linear-gradient(135deg,#fff,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>📖 Lore & Encyclopédie</h1>
          <button style={S.btnGold} onClick={newArticle}>＋ Nouvel article</button>
        </div>
        <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
          <button onClick={()=>setCatFilter('')} style={{background:catFilter===''?'rgba(212,160,23,.15)':'#0a1829',border:`1px solid ${catFilter===''?'#d4a017':'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:catFilter===''?'#f0c040':'#7a9ab8',cursor:'pointer'}}>Tous</button>
          {CATS.map(c => <button key={c.id} onClick={()=>setCatFilter(c.id)} style={{background:catFilter===c.id?`${c.color}22`:'#0a1829',border:`1px solid ${catFilter===c.id?c.color:'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:catFilter===c.id?c.color:'#7a9ab8',cursor:'pointer'}}>{c.label}</button>)}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'1.25rem',padding:'0 2rem 4rem',maxWidth:1400,margin:'0 auto'}}>
        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:'.4rem'}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.65rem',letterSpacing:'.15em',textTransform:'uppercase',color:'#4a6880',padding:'.5rem .75rem',borderBottom:'1px solid rgba(30,120,200,.2)',marginBottom:'.25rem'}}>📚 Articles ({filtered.length})</div>
          {filtered.map(a => {
            const cat = CATS.find(c => c.id === a.categorie)
            return (
              <button key={a.id} onClick={() => selectArticle(a)} style={{width:'100%',textAlign:'left',background:selected?.id===a.id?'rgba(212,160,23,.15)':'none',border:`1px solid ${selected?.id===a.id?'#d4a017':'transparent'}`,borderRadius:9,padding:'.65rem .85rem',cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',gap:'.65rem'}}>
                <span style={{fontSize:'1.1rem',flexShrink:0}}>{a.emoji||'📄'}</span>
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',color:'#e8eef5',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.titre}</div>
                  {cat && <div style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.06em',textTransform:'uppercase',color:cat.color,marginTop:'.08rem'}}>{cat.label}</div>}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <div style={{textAlign:'center',padding:'2rem 1rem',color:'#4a6880',fontFamily:"'Cinzel',serif",fontSize:'.65rem',letterSpacing:'.09em',textTransform:'uppercase'}}>Aucun article</div>}
          <button style={{width:'100%',background:'#0a1829',border:'2px dashed rgba(30,120,200,.2)',borderRadius:9,padding:'.75rem',color:'#4a6880',fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.09em',textTransform:'uppercase',cursor:'pointer',marginTop:'.5rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem'}} onClick={newArticle}>＋ Nouvel article</button>
        </div>

        {/* Editor / Viewer */}
        <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:14,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:500}}>
          {!selected && !editing && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,padding:'4rem 2rem',textAlign:'center',color:'#4a6880'}}>
              <div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.3}}>📖</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Sélectionne ou crée un article</div>
              <button style={S.btnGold} onClick={newArticle}>＋ Créer le premier article</button>
            </div>
          )}
          {(selected || editing) && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.75rem 1.1rem',borderBottom:'1px solid rgba(30,120,200,.2)',flexWrap:'wrap'}}>
                <input style={{...S.input,width:52,fontSize:'1.4rem',textAlign:'center',padding:'.3rem',borderRadius:8,flexShrink:0}} value={form.emoji||'📄'} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} title="Emoji" />
                <input style={{...S.input,flex:1,minWidth:150,fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color:'#f0c040',background:'none',border:'none',padding:'.3rem'}} value={form.titre||''} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="Titre de l'article..." />
                <select style={{...S.input,width:'auto',fontSize:'.72rem'}} value={form.categorie||'divers'} onChange={e=>setForm(f=>({...f,categorie:e.target.value}))}>
                  {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button style={{...S.btnGold,padding:'.4rem .9rem',fontSize:'.62rem'}} onClick={saveArticle}>{saving?'⏳':'💾'} Sauvegarder</button>
                {selected && <button style={{background:'rgba(224,48,48,.12)',color:'#ff6060',border:'1px solid rgba(224,48,48,.3)',borderRadius:8,padding:'.4rem .75rem',fontFamily:"'Cinzel',serif",fontSize:'.62rem',cursor:'pointer'}} onClick={()=>deleteArticle(selected.id)}>🗑</button>}
              </div>
              <textarea
                style={{flex:1,background:'none',border:'none',outline:'none',resize:'none',color:'#e8eef5',fontFamily:"'Crimson Pro',serif",fontSize:'1.05rem',lineHeight:1.85,padding:'1.35rem 1.5rem',minHeight:400}}
                value={form.contenu||''}
                onChange={e=>handleContentChange(e.target.value)}
                placeholder={'Écris le contenu de cet article ici...\n\nTu peux structurer avec :\n## Titre de section\n**texte en gras**\n• élément de liste\n---  (séparateur)\n\nLa sauvegarde est automatique.'}
              />
              <div style={{padding:'.5rem 1.1rem',borderTop:'1px solid rgba(30,120,200,.2)',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#4a6880',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span><span style={{width:6,height:6,borderRadius:'50%',background:'#40d060',display:'inline-block',marginRight:'.4rem'}}></span>Sauvegarde automatique</span>
                <span>{(form.contenu||'').length} caractères</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
test 
