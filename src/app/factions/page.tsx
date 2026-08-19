'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

interface Rang { nom: string; ordre: number }

interface Faction {
  id: string
  nom: string
  emoji?: string
  type?: string
  description?: string
  gdoc?: string
  miro?: string
  rangs?: Rang[]
  couleur?: string
  ordre_manuel?: number | null
}

interface MemberRang { faction: string; rang: string; ordre?: number }
interface Member { id: string; nom: string; emoji?: string; type: string; photos?: string[]; factions?: string[]; rang?: string; rangs?: MemberRang[]; prime?: string; condition_prime?: string }
interface LinkedIle { id: string; nom: string; emoji?: string; factions?: string[] }

function memberRangFor(m: Member, factionNom: string): string | undefined {
  if (m.rangs !== undefined) return m.rangs.find(r => r.faction === factionNom)?.rang
  return m.rang
}
function memberOrdreFor(m: Member, factionNom: string): number | undefined {
  return m.rangs?.find(r => r.faction === factionNom)?.ordre
}
function parsePrime(p?: string) { return parseInt((p || '0').replace(/[^\d]/g, ''), 10) || 0 }
// Trie une liste de membres (au sein d'un même rang) par ordre manuel s'il a été fixé par
// glisser-déposer, sinon par prime décroissante ; les "Non recherché" ne comptent pas comme
// une prime et sont toujours relégués en dernier — le classement manuel est un raffinement
// secondaire, il ne fait jamais sortir un membre de son groupe de rang.
function sortMembersInTier(items: Member[], factionNom: string) {
  return items.slice().sort((a, b) => {
    const oa = memberOrdreFor(a, factionNom) ?? Infinity
    const ob = memberOrdreFor(b, factionNom) ?? Infinity
    if (oa !== ob) return oa - ob
    const na = a.condition_prime === 'non_recherche' ? 1 : 0
    const nb = b.condition_prime === 'non_recherche' ? 1 : 0
    if (na !== nb) return na - nb
    return parsePrime(b.prime) - parsePrime(a.prime)
  })
}
// La prime du "capitaine" d'une faction : le ou les membres au rang le plus haut défini pour
// cette faction (ordre le plus bas) ; à défaut de rang défini, le membre le mieux payé.
function captainPrime(faction: Faction, members: Member[]): number {
  const facMembers = members.filter(m => m.factions?.includes(faction.nom))
  const rangs = (faction.rangs || []).slice().sort((a, b) => a.ordre - b.ordre)
  if (rangs.length === 0) return facMembers.length ? Math.max(...facMembers.map(m => parsePrime(m.prime))) : 0
  const topRang = rangs[0].nom
  const captains = facMembers.filter(m => memberRangFor(m, faction.nom) === topRang)
  if (captains.length === 0) return 0
  return Math.max(...captains.map(m => parsePrime(m.prime)))
}
// Somme des primes de tous les membres — n'a pas vraiment de sens pour les factions de
// type Peuple (ce ne sont pas des équipages de primes), donc on ne l'affiche pas pour elles.
function totalPrime(faction: Faction, members: Member[]): number {
  return members.filter(m => m.factions?.includes(faction.nom)).reduce((sum, m) => sum + parsePrime(m.prime), 0)
}

const TYPES = ['Pirates', 'Marine', 'Gouvernement', 'Révolutionnaire', 'Peuple', 'Neutre', 'Autre']
const TYPE_COLORS: Record<string,string> = { Pirates:'#d4a017', Marine:'#00c8ff', Gouvernement:'#4488ff', 'Révolutionnaire':'#e03030', Peuple:'#40e0a0', Neutre:'#7a9ab8', Autre:'#a060ff' }
const TYPE_EMOJI: Record<string,string> = { Pirates:'🏴‍☠️', Marine:'⚓', Gouvernement:'🏛️', 'Révolutionnaire':'✊', Peuple:'👥', Neutre:'🤝', Autre:'⚔️' }
const MEMBER_TYPE_COLORS: Record<string, string> = { pj: '#00c8ff', pnj: '#d4a017', antagoniste: '#e03030', 'allié': '#40d060' }
const MEMBER_TYPE_LABELS: Record<string, string> = { pj: 'Joueurs', pnj: 'PNJ', antagoniste: 'Antagonistes', 'allié': 'Alliés' }
type FactionSortMode = 'categorie' | 'az' | 'prime' | 'manuel'

// Les factions sont réparties en 4 pages, chacune avec sa couleur dominante. Une faction
// individuelle (surtout côté Pirates/Peuple, où il y a beaucoup d'équipages distincts) peut
// remplacer cette couleur par la sienne via le champ "couleur".
type PageTab = 'pirates' | 'marine' | 'peuple' | 'sans_groupe'
const PAGE_ORDER: PageTab[] = ['pirates', 'marine', 'peuple', 'sans_groupe']
const PAGE_THEMES: Record<PageTab, { label: string; emoji: string; color: string }> = {
  pirates: { label: 'Pirates', emoji: '🏴‍☠️', color: '#e03030' },
  marine: { label: 'Marine · CP · Shichibukai · GM', emoji: '⚓', color: '#3f7fe0' },
  peuple: { label: 'Peuple', emoji: '👥', color: '#40d060' },
  sans_groupe: { label: 'Sans groupe', emoji: '✨', color: '#f0c040' },
}
function factionPage(f: Faction): PageTab {
  if (f.type === 'Pirates') return 'pirates'
  if (f.type === 'Marine' || f.type === 'Gouvernement') return 'marine'
  if (f.type === 'Peuple') return 'peuple'
  return 'sans_groupe'
}
function factionColor(f: Faction): string {
  return f.couleur || PAGE_THEMES[factionPage(f)].color
}

function sortFactions(items: Faction[], mode: FactionSortMode, members: Member[]) {
  return items.slice().sort((a, b) => {
    if (mode === 'az') return a.nom.localeCompare(b.nom)
    if (mode === 'prime') return captainPrime(b, members) - captainPrime(a, members)
    if (mode === 'manuel') {
      const oa = a.ordre_manuel ?? Infinity
      const ob = b.ordre_manuel ?? Infinity
      return oa !== ob ? oa - ob : a.nom.localeCompare(b.nom)
    }
    const ai = TYPES.indexOf(a.type || '')
    const bi = TYPES.indexOf(b.type || '')
    return ((ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)) || a.nom.localeCompare(b.nom)
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
  modal: { background:'#0a1829', border:'1px solid rgba(30,180,255,.4)', borderRadius:18, maxWidth:580, width:'100%', maxHeight:'90vh', overflowY:'auto' as const, boxShadow:'0 40px 80px rgba(0,0,0,.8)' },
}

export default function FactionsPage() {
  const [list, setList] = useState<Faction[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState<Partial<Faction>>({ nom:'', emoji:'⚔️', type:'Pirates', description:'', gdoc:'', miro:'' })
  const [members, setMembers] = useState<Member[]>([])
  const [linkedIles, setLinkedIles] = useState<LinkedIle[]>([])
  const [rosterFaction, setRosterFaction] = useState<Faction | null>(null)
  const [sortMode, setSortMode] = useState<FactionSortMode>('categorie')
  const [pageTab, setPageTab] = useState<PageTab>('pirates')
  const [draggingMemberId, setDraggingMemberId] = useState<string | null>(null)
  const [draggingFactionId, setDraggingFactionId] = useState<string | null>(null)

  useEffect(() => {
    fetchList(); fetchMembers(); fetchIlesList()
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearch(q)
  }, [])

  async function fetchList() {
    const { data } = await supabase.from('factions').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  async function fetchMembers() {
    const { data } = await supabase.from('personnages').select('id, nom, emoji, type, photos, factions, rang, rangs, prime, condition_prime')
    setMembers(data || [])
  }

  // Une faction est référencée par son nom (texte) partout ailleurs dans l'app — la renommer
  // doit donc mettre à jour toutes ces références, sinon les personnages/îles qui la
  // pointaient se retrouvent orphelins et on a l'impression qu'une "nouvelle" faction est
  // apparue à côté de l'ancienne.
  // Séquentiel et un seul update par personnage concerné (au lieu de plusieurs appels
  // parallèles par personne) : avec beaucoup de membres (ex. "Kami", "Equipage Enma
  // Kurojin"), des dizaines de requêtes simultanées pouvaient faire échouer certaines
  // d'entre elles silencieusement (aucune erreur n'était vérifiée), laissant une partie
  // des membres sur l'ancien nom — ce qui donnait l'impression qu'un doublon de faction
  // avait été créé. On vérifie maintenant chaque erreur et on prévient si besoin.
  async function cascadeFactionRename(oldNom: string, newNom: string): Promise<number> {
    const [psAll, ilesFac, childFac] = await Promise.all([
      supabase.from('personnages').select('id, factions, equipage, rangs'),
      supabase.from('iles').select('id, factions').contains('factions', [oldNom]),
      supabase.from('factions').select('id, factions_parentes').contains('factions_parentes', [oldNom]),
    ])
    let failures = 0
    for (const p of (psAll.data || []) as { id: string; factions?: string[]; equipage?: string; rangs?: { faction: string; rang: string }[] }[]) {
      const hasFaction = (p.factions || []).includes(oldNom)
      const hasEquipage = p.equipage === oldNom
      const hasRang = (p.rangs || []).some(r => r.faction === oldNom)
      if (!hasFaction && !hasEquipage && !hasRang) continue
      const patch: { factions?: string[]; equipage?: string; rangs?: { faction: string; rang: string }[] } = {}
      if (hasFaction) patch.factions = (p.factions || []).map(n => n === oldNom ? newNom : n)
      if (hasEquipage) patch.equipage = newNom
      if (hasRang) patch.rangs = (p.rangs || []).map(r => r.faction === oldNom ? { ...r, faction: newNom } : r)
      const { error } = await supabase.from('personnages').update(patch).eq('id', p.id)
      if (error) failures++
    }
    for (const i of (ilesFac.data || []) as { id: string; factions?: string[] }[]) {
      const { error } = await supabase.from('iles').update({ factions: (i.factions || []).map(n => n === oldNom ? newNom : n) }).eq('id', i.id)
      if (error) failures++
    }
    for (const f of (childFac.data || []) as { id: string; factions_parentes?: string[] }[]) {
      const { error } = await supabase.from('factions').update({ factions_parentes: (f.factions_parentes || []).map(n => n === oldNom ? newNom : n) }).eq('id', f.id)
      if (error) failures++
    }
    return failures
  }

  async function fetchIlesList() {
    const { data } = await supabase.from('iles').select('id, nom, emoji, factions')
    setLinkedIles(data || [])
  }

  // Réordonne les membres d'un même rang par glisser-déposer : ne touche que l'entrée de
  // rang correspondant à cette faction, sans jamais faire sortir un membre de son groupe.
  async function reorderMembers(tierItems: Member[], factionNom: string, fromId: string, toId: string) {
    const fromIdx = tierItems.findIndex(m => m.id === fromId)
    const toIdx = tierItems.findIndex(m => m.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const reordered = tierItems.slice()
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    for (let i = 0; i < reordered.length; i++) {
      const m = reordered[i]
      const newRangs = (m.rangs || []).map(r => r.faction === factionNom ? { ...r, ordre: i } : r)
      await supabase.from('personnages').update({ rangs: newRangs }).eq('id', m.id)
    }
    fetchMembers()
  }

  // Réordonne les factions de l'onglet courant par glisser-déposer (mode de tri "manuel").
  async function reorderFactions(currentOrder: Faction[], fromId: string, toId: string) {
    const fromIdx = currentOrder.findIndex(f => f.id === fromId)
    const toIdx = currentOrder.findIndex(f => f.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
    const reordered = currentOrder.slice()
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    let failures = 0
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].ordre_manuel !== i) {
        const { error } = await supabase.from('factions').update({ ordre_manuel: i }).eq('id', reordered[i].id)
        if (error) failures++
      }
    }
    if (failures > 0) alert(`Le nouvel ordre n'a pas pu être enregistré (colonne "ordre_manuel" manquante ? voir supabase-migration-14.sql).`)
    fetchList()
  }

  function openForm(f?: Faction) {
    if (f) { setForm({ ...f, rangs: f.rangs || [] }); setEditId(f.id) }
    else { setForm({ nom:'', emoji:TYPE_EMOJI.Pirates, type:'Pirates', description:'', gdoc:'', miro:'', rangs:[] }); setEditId(null) }
    setShowForm(true)
  }

  function addRang() {
    setForm(f => ({ ...f, rangs: [...(f.rangs || []), { nom: '', ordre: (f.rangs?.length || 0) + 1 }] }))
  }
  function updateRang(i: number, val: Rang) {
    setForm(f => ({ ...f, rangs: (f.rangs || []).map((r, idx) => idx === i ? val : r) }))
  }
  function removeRang(i: number) {
    setForm(f => ({ ...f, rangs: (f.rangs || []).filter((_, idx) => idx !== i) }))
  }

  async function saveForm() {
    if (!form.nom?.trim()) { alert('Le nom est obligatoire !'); return }
    const newNom = form.nom.trim()
    const data = { ...form, nom: newNom, rangs: (form.rangs || []).filter(r => r.nom.trim()) }
    const original = editId ? list.find(f => f.id === editId) : null
    const { error } = editId
      ? await supabase.from('factions').update(data).eq('id', editId)
      : await supabase.from('factions').insert([data])
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    if (original && original.nom !== newNom) {
      const failures = await cascadeFactionRename(original.nom, newNom)
      if (failures > 0) alert(`La faction a été renommée, mais ${failures} mise${failures>1?'s':''} à jour de membres/liens a échoué. Vérifie "${newNom}" et relance le renommage si besoin.`)
    }
    setShowForm(false); fetchList(); fetchMembers(); fetchIlesList()
  }

  async function deleteFaction(id: string) {
    if (!confirm('Supprimer cette faction ?')) return
    await supabase.from('factions').delete().eq('id', id); fetchList()
  }

  async function duplicateFaction(f: Faction) {
    const { id, ...rest } = f
    void id
    await supabase.from('factions').insert([{ ...rest, nom: rest.nom + ' (copie)' }])
    fetchList()
  }

  const navLinks = [['Accueil','/'],['Personnages','/personnages'],['Fruits','/fruits'],['Despas','/despas'],['Lames','/lames'],['Cristaux','/cristaux'],['Îles','/iles'],['Factions','/factions'],['Journaux','/journaux'],['Lore','/lore'],['Dashboard','/dashboard']]
  const theme = PAGE_THEMES[pageTab]
  let filtered = list.filter(f => factionPage(f) === pageTab)
  if (typeFilter) filtered = filtered.filter(f => f.type === typeFilter)
  if (search) filtered = filtered.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()))
  filtered = sortFactions(filtered, sortMode, members)
  const typesInTab = TYPES.filter(t => list.some(f => factionPage(f) === pageTab && f.type === t))

  return (
    <div style={{ ...S.page, background: `radial-gradient(ellipse 1400px 500px at 50% 0%, ${theme.color}14, #050d1a 60%)` }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d4a017;border-radius:3px}`}</style>
      <nav style={S.nav}>
        <a href="/" style={S.logo}><span style={{width:30,height:30,background:'linear-gradient(135deg,#d4a017,#f0c040)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>☠</span>Grand Line</a>
        <div style={{flex:1,display:'flex',gap:'.3rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {navLinks.map(([l,h]) => <a key={h} href={h} style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.06em',textTransform:'uppercase',color:h==='/factions'?'#f0c040':'#7a9ab8',textDecoration:'none',padding:'.38rem .6rem',borderRadius:6,whiteSpace:'nowrap',background:h==='/factions'?'rgba(212,160,23,.15)':'none'}}>{l}</a>)}
        </div>
        <GlobalSearch />
        <a href="/dashboard" style={{...S.btnGold,padding:'.38rem .85rem',textDecoration:'none',fontSize:'.62rem'}}>⚓ MJ</a>
      </nav>

      <div style={{padding:'2.5rem 2rem 1.5rem',maxWidth:1400,margin:'0 auto'}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.6rem',letterSpacing:'.1em',color:'#7a9ab8',textTransform:'uppercase',marginBottom:'.4rem'}}>🏴‍☠️ › Factions › {theme.label}</div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
          <h1 style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:700,background:'linear-gradient(135deg,#fff,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Factions</h1>
          <button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter une faction</button>
        </div>

        {/* Menu à 4 pages */}
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
          {PAGE_ORDER.map(tab => {
            const t = PAGE_THEMES[tab]
            const active = pageTab === tab
            const count = list.filter(f => factionPage(f) === tab).length
            return (
              <button key={tab} onClick={() => { setPageTab(tab); setTypeFilter('') }} style={{background:active?`${t.color}22`:'#0a1829',border:`1.5px solid ${active?t.color:'rgba(30,120,200,.2)'}`,borderRadius:12,padding:'.6rem 1.1rem',fontFamily:"'Cinzel',serif",fontSize:'.68rem',letterSpacing:'.05em',textTransform:'uppercase',color:active?t.color:'#7a9ab8',cursor:'pointer',display:'flex',alignItems:'center',gap:'.5rem',boxShadow:active?`0 0 16px ${t.color}33`:'none',whiteSpace:'nowrap'}}>
                {t.emoji} {t.label} <span style={{opacity:.7}}>({count})</span>
              </button>
            )
          })}
        </div>

        <div style={{display:'flex',gap:'.65rem',marginBottom:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220,position:'relative'}}>
            <span style={{position:'absolute',left:'.75rem',top:'50%',transform:'translateY(-50%)',color:'#4a6880'}}>🔍</span>
            <input style={{...S.input,paddingLeft:'2.5rem'}} placeholder="Rechercher une faction..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{display:'flex',gap:'.3rem',alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#4a6880'}}>Trier :</span>
            {([['categorie','Par catégorie'],['az','A→Z'],['prime','Prime du capitaine'],['manuel','Manuel (glisser-déposer)']] as [FactionSortMode,string][]).map(([mode,label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} style={{background:sortMode===mode?`${theme.color}22`:'#0a1829',border:`1px solid ${sortMode===mode?theme.color:'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .7rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.05em',color:sortMode===mode?theme.color:'#7a9ab8',cursor:'pointer',whiteSpace:'nowrap'}}>{label}</button>
            ))}
          </div>
        </div>
        {typesInTab.length > 1 && (
          <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
            <button onClick={() => setTypeFilter('')} style={{background:typeFilter===''?`${theme.color}22`:'#0a1829',border:`1px solid ${typeFilter===''?theme.color:'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:typeFilter===''?theme.color:'#7a9ab8',cursor:'pointer'}}>Tous types</button>
            {typesInTab.map(t => <button key={t} onClick={() => setTypeFilter(t)} style={{background:typeFilter===t?`${TYPE_COLORS[t]}22`:'#0a1829',border:`1px solid ${typeFilter===t?TYPE_COLORS[t]:'rgba(30,120,200,.2)'}`,borderRadius:100,padding:'.3rem .8rem',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.07em',textTransform:'uppercase',color:typeFilter===t?TYPE_COLORS[t]:'#7a9ab8',cursor:'pointer'}}>{t}</button>)}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'1.1rem',padding:'0 2rem 4rem',maxWidth:1400,margin:'0 auto'}}>
        {filtered.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:'5rem 2rem',color:'#4a6880'}}><div style={{fontSize:'4rem',marginBottom:'1rem',opacity:.4}}>{theme.emoji}</div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1.5rem'}}>Aucune faction dans « {theme.label} »</div><button style={S.btnGold} onClick={() => openForm()}>＋ Ajouter une faction</button></div>}
        {(() => {
          let lastType: string | undefined | null = undefined
          const nodes: React.ReactNode[] = []
          filtered.forEach(f => {
            const tc = factionColor(f)
            if (sortMode === 'categorie' && f.type !== lastType) {
              lastType = f.type
              nodes.push(
                <div key={`divider-${f.type}-${f.id}`} style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:'.75rem',margin:'.4rem 0'}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.65rem',letterSpacing:'.14em',textTransform:'uppercase',color:TYPE_COLORS[f.type||'']||theme.color,whiteSpace:'nowrap'}}>{TYPE_EMOJI[f.type||''] || '⚔️'} {f.type || 'Autre'}</div>
                  <div style={{flex:1,height:1,background:`${theme.color}33`}} />
                </div>
              )
            }
            const cap = captainPrime(f, members)
            const tot = f.type !== 'Peuple' ? totalPrime(f, members) : 0
            const manual = sortMode === 'manuel'
            nodes.push(
              <div key={f.id} style={{background:'#0d2040',border:`1px solid ${manual && draggingFactionId===f.id ? '#d4a017' : tc+'33'}`,borderRadius:14,padding:'1.35rem',transition:'all .3s',display:'flex',flexDirection:'column',gap:'.6rem',opacity:manual && draggingFactionId===f.id?.4:1,cursor:manual?'grab':undefined}}
                draggable={manual}
                onDragStart={manual ? e => { setDraggingFactionId(f.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id) } : undefined}
                onDragEnd={() => setDraggingFactionId(null)}
                onDragOver={manual ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } : undefined}
                onDrop={manual ? e => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); reorderFactions(filtered, fromId, f.id) } : undefined}
                onMouseEnter={e=>{const el=e.currentTarget;el.style.transform='translateY(-5px)';el.style.borderColor=tc;el.style.boxShadow=`0 18px 36px rgba(0,0,0,.4)`}}
                onMouseLeave={e=>{const el=e.currentTarget;el.style.transform='none';el.style.borderColor=`${tc}33`;el.style.boxShadow='none'}}>
                <div style={{fontSize:'2.5rem',cursor:'pointer'}} onClick={() => setRosterFaction(f)}>{f.emoji||'⚔️'}</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'#e8eef5',cursor:'pointer'}} onClick={() => setRosterFaction(f)}>{f.nom}</div>
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                  <div style={{display:'inline-block',background:`${tc}22`,color:tc,border:`1px solid ${tc}44`,borderRadius:100,padding:'.15rem .65rem',fontFamily:"'Cinzel',serif",fontSize:'.55rem',letterSpacing:'.09em',textTransform:'uppercase',width:'fit-content'}}>{f.type}</div>
                  {cap > 0 && <div title="Prime du capitaine" style={{display:'inline-block',background:'rgba(240,192,64,.12)',color:'#f0c040',border:'1px solid rgba(240,192,64,.3)',borderRadius:100,padding:'.15rem .65rem',fontFamily:"'Cinzel',serif",fontSize:'.55rem',letterSpacing:'.05em',width:'fit-content'}}>⭐ {cap.toLocaleString('fr-FR')}</div>}
                  {tot > 0 && <div title="Prime totale de la faction" style={{display:'inline-block',background:'rgba(224,48,48,.12)',color:'#ff8080',border:'1px solid rgba(224,48,48,.3)',borderRadius:100,padding:'.15rem .65rem',fontFamily:"'Cinzel',serif",fontSize:'.55rem',letterSpacing:'.05em',width:'fit-content'}}>💰 {tot.toLocaleString('fr-FR')}</div>}
                </div>
                {f.description && <div style={{fontSize:'.88rem',color:'#7a9ab8',lineHeight:1.6,fontStyle:'italic',flex:1}}>{f.description}</div>}
                <div style={{fontSize:'.78rem',color:'#4a6880'}}>👥 {members.filter(m => m.factions?.includes(f.nom)).length} membre(s)</div>
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center'}}>
                  {f.gdoc && <a href={f.gdoc} target="_blank" rel="noopener" style={{background:'rgba(66,133,244,.12)',color:'#6aabff',border:'1px solid rgba(66,133,244,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>📄 Doc</a>}
                  {f.miro && <a href={f.miro} target="_blank" rel="noopener" style={{background:'rgba(255,196,0,.1)',color:'#ffc400',border:'1px solid rgba(255,196,0,.25)',borderRadius:6,padding:'.18rem .5rem',fontFamily:"'Cinzel',serif",fontSize:'.48rem',textDecoration:'none'}}>🗒 Miro</a>}
                  <div style={{marginLeft:'auto',display:'flex',gap:'.3rem'}}>
                    <button onClick={() => setRosterFaction(f)} title="Voir l'organigramme" style={{background:'rgba(64,208,96,.1)',border:'1px solid rgba(64,208,96,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#40d060',cursor:'pointer',fontSize:'.7rem'}}>👁</button>
                    <button onClick={() => duplicateFaction(f)} title="Dupliquer" style={{background:'rgba(160,96,255,.1)',border:'1px solid rgba(160,96,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#a060ff',cursor:'pointer',fontSize:'.7rem'}}>⧉</button>
                    <button onClick={() => openForm(f)} style={{background:'rgba(0,200,255,.1)',border:'1px solid rgba(0,200,255,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#00c8ff',cursor:'pointer',fontSize:'.7rem'}}>✏️</button>
                    <button onClick={() => deleteFaction(f.id)} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.2rem .5rem',color:'#ff6060',cursor:'pointer',fontSize:'.7rem'}}>🗑</button>
                  </div>
                </div>
              </div>
            )
          })
          return nodes
        })()}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={S.modal}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{editId?'✏️ Modifier':'✚ Nouvelle Faction'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem'}}>✕</button>
            </div>
            <div style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.1rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'.85rem',alignItems:'end'}}>
                <div><label style={S.label}>Nom *</label><input style={S.input} value={form.nom||''} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Marine Mondiale" /></div>
                <div><label style={S.label}>Emoji</label><input style={{...S.input,width:70,fontSize:'1.4rem',textAlign:'center'}} value={form.emoji||'⚔️'} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'.85rem',alignItems:'end'}}>
                <div><label style={S.label}>Type</label>
                  <select style={{...S.input}} value={form.type||'Pirates'} onChange={e=>setForm(f=>({...f,type:e.target.value,emoji:TYPE_EMOJI[e.target.value]||f.emoji}))}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label} title="Remplace la couleur de la page pour cette faction (surtout utile côté Pirates/Peuple, avec beaucoup de groupes distincts)">🎨 Couleur</label>
                  <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
                    <input type="color" value={form.couleur || PAGE_THEMES[factionPage({ ...form, id:'' } as Faction)].color} onChange={e=>setForm(f=>({...f,couleur:e.target.value}))} style={{width:44,height:38,padding:2,border:'1px solid rgba(30,120,200,.2)',borderRadius:8,background:'#0d2040',cursor:'pointer'}} />
                    {form.couleur && <button type="button" onClick={()=>setForm(f=>({...f,couleur:undefined}))} title="Revenir à la couleur de la page" style={{background:'none',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.5rem .6rem',color:'#ff6060',cursor:'pointer',fontSize:'.8rem'}}>✕</button>}
                  </div>
                </div>
              </div>
              <div><label style={S.label}>Description</label><textarea style={{...S.input,minHeight:100,resize:'vertical',lineHeight:1.7}} value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Rôle, objectifs, territoire..." /></div>

              <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'1.1rem'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
                  <div style={S.label}>🎖️ Rangs hiérarchiques</div>
                  <button type="button" onClick={addRang} style={{background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.3)',borderRadius:8,padding:'.3rem .7rem',color:'#d4a017',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer'}}>＋ Ajouter un rang</button>
                </div>
                {(form.rangs || []).length === 0 && (
                  <div style={{fontSize:'.8rem',color:'#4a6880',fontStyle:'italic'}}>Aucun rang défini — l&apos;organigramme groupera par PJ / PNJ / Allié / Antagoniste par défaut.</div>
                )}
                {(form.rangs || []).map((r, i) => (
                  <div key={i} style={{display:'flex',gap:'.5rem',marginBottom:'.5rem',alignItems:'center'}}>
                    <input type="number" min={1} title="Ordre (1 = rang le plus haut)" style={{...S.input,width:64,textAlign:'center'}} value={r.ordre} onChange={e=>updateRang(i,{...r,ordre:parseInt(e.target.value)||1})} />
                    <input style={{...S.input,flex:1}} value={r.nom} onChange={e=>updateRang(i,{...r,nom:e.target.value})} placeholder="Nom du rang (ex: Capitaine)" />
                    <button type="button" onClick={()=>removeRang(i)} style={{background:'rgba(224,48,48,.1)',border:'1px solid rgba(224,48,48,.25)',borderRadius:8,padding:'.45rem .7rem',color:'#ff6060',cursor:'pointer',flexShrink:0}}>✕</button>
                  </div>
                ))}
                {(form.rangs || []).length > 0 && (
                  <div style={{fontSize:'.72rem',color:'#4a6880',fontStyle:'italic',marginTop:'.3rem'}}>Niveau 1 = rang le plus haut dans l&apos;organigramme.</div>
                )}
              </div>

              <div style={{background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:10,padding:'1.1rem'}}>
                <div style={{...S.label,marginBottom:'.75rem'}}>🔗 Liens</div>
                <div style={{marginBottom:'.65rem'}}><label style={{...S.label,color:'#7a9ab8'}}>📄 Google Doc</label><input style={S.input} value={form.gdoc||''} onChange={e=>setForm(f=>({...f,gdoc:e.target.value}))} placeholder="https://docs.google.com/..." /></div>
                <div><label style={{...S.label,color:'#7a9ab8'}}>🗒 Miro</label><input style={S.input} value={form.miro||''} onChange={e=>setForm(f=>({...f,miro:e.target.value}))} placeholder="https://miro.com/..." /></div>
              </div>
            </div>
            <div style={{padding:'1.1rem 1.75rem',borderTop:'1px solid rgba(30,120,200,.2)',display:'flex',gap:'.65rem',justifyContent:'flex-end',position:'sticky',bottom:0,background:'#0a1829',borderRadius:'0 0 18px 18px'}}>
              <button style={S.btnCyan} onClick={()=>setShowForm(false)}>Annuler</button>
              <button style={S.btnGold} onClick={saveForm}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ROSTER / ORGANIGRAMME ===== */}
      {rosterFaction && (
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setRosterFaction(null)}}>
          <div style={{...S.modal, maxWidth:820}}>
            <div style={{padding:'1.35rem 1.75rem',borderBottom:'1px solid rgba(30,120,200,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'#0a1829',borderRadius:'18px 18px 0 0',zIndex:5}}>
              <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
                <span style={{fontSize:'1.5rem'}}>{rosterFaction.emoji||'⚔️'}</span>
                <div style={{fontFamily:"'Cinzel Decorative',serif",fontSize:'1.15rem',color:'#f0c040'}}>{rosterFaction.nom}</div>
              </div>
              <button onClick={()=>setRosterFaction(null)} style={{background:'rgba(5,13,26,.75)',border:'1px solid rgba(30,120,200,.2)',color:'#7a9ab8',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:'.9rem'}}>✕</button>
            </div>
            <div style={{padding:'1.75rem'}}>
              {rosterFaction.description && <p style={{fontSize:'.95rem',color:'#7a9ab8',lineHeight:1.7,fontStyle:'italic',marginBottom:'1.5rem'}}>{rosterFaction.description}</p>}

              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.7rem',letterSpacing:'.14em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                🧬 Organigramme <div style={{flex:1,height:1,background:'rgba(30,120,200,.2)'}} />
                <button onClick={()=>{openForm(rosterFaction); setRosterFaction(null)}} style={{...S.btnCyan, padding:'.35rem .8rem', fontSize:'.58rem'}}>🎖️ Gérer les rangs</button>
                <a href={`/personnages?newFaction=${encodeURIComponent(rosterFaction.nom)}`} style={{...S.btnGold, padding:'.35rem .8rem', fontSize:'.58rem', textDecoration:'none'}}>＋ Ajouter un personnage</a>
              </div>

              {(() => {
                const factionMembers = members.filter(m => m.factions?.includes(rosterFaction.nom))
                if (factionMembers.length === 0) return <div style={{textAlign:'center',padding:'2rem',color:'#4a6880',fontStyle:'italic',fontSize:'.88rem',marginBottom:'1.5rem'}}>Aucun membre pour l&apos;instant.</div>
                const tc = TYPE_COLORS[rosterFaction.type||''] || '#a060ff'
                const rangs = (rosterFaction.rangs || []).slice().sort((a,b) => a.ordre - b.ordre)
                let groups: { label: string; color: string; items: Member[]; draggable?: boolean }[]
                if (rangs.length > 0) {
                  groups = rangs.map(r => ({ label: r.nom, color: '#d4a017', items: sortMembersInTier(factionMembers.filter(m => memberRangFor(m, rosterFaction.nom) === r.nom), rosterFaction.nom), draggable: true })).filter(g => g.items.length > 0)
                  const sansRang = factionMembers.filter(m => !rangs.some(r => r.nom === memberRangFor(m, rosterFaction.nom)))
                  if (sansRang.length > 0) groups.push({ label: 'Sans rang', color: '#7a9ab8', items: sortMembersInTier(sansRang, rosterFaction.nom) })
                } else {
                  groups = ['pj','pnj','allié','antagoniste'].map(t => ({ label: MEMBER_TYPE_LABELS[t], color: MEMBER_TYPE_COLORS[t], items: sortMembersInTier(factionMembers.filter(m => m.type === t), rosterFaction.nom) })).filter(g => g.items.length > 0)
                }
                return (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,marginBottom:'2rem'}}>
                    <div style={{background:`${tc}22`,border:`1px solid ${tc}66`,borderRadius:12,padding:'.75rem 1.5rem',fontFamily:"'Cinzel',serif",fontSize:'.85rem',fontWeight:700,color:tc,marginBottom:'0'}}>{rosterFaction.emoji} {rosterFaction.nom}</div>
                    <div style={{width:2,height:20,background:'rgba(30,120,200,.3)'}} />
                    {rangs.length > 0 && <div style={{fontSize:'.68rem',color:'#4a6880',fontStyle:'italic',marginBottom:'.5rem'}}>Glisse un membre pour ajuster son ordre au sein de son rang.</div>}
                    {groups.map((g, gi) => (
                      <div key={g.label} style={{width:'100%'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.5rem',margin:'0 0 .6rem'}}>
                          <div style={{flex:1,height:1,background:'rgba(30,120,200,.15)'}} />
                          <span style={{fontFamily:"'Cinzel',serif",fontSize:'.55rem',letterSpacing:'.1em',textTransform:'uppercase',color:g.color}}>{g.label}</span>
                          <div style={{flex:1,height:1,background:'rgba(30,120,200,.15)'}} />
                        </div>
                        <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',justifyContent:'center',marginBottom: gi < groups.length-1 ? '1.25rem' : 0}}>
                          {g.items.map(m => (
                            <a key={m.id} href={`/personnages?open=${m.id}`} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.4rem',textDecoration:'none',width:84,cursor:g.draggable?'grab':'pointer',opacity:draggingMemberId===m.id?.4:1}}
                              draggable={!!g.draggable}
                              onDragStart={g.draggable ? e => { setDraggingMemberId(m.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.id) } : undefined}
                              onDragEnd={() => setDraggingMemberId(null)}
                              onDragOver={g.draggable ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } : undefined}
                              onDrop={g.draggable ? e => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); reorderMembers(g.items, rosterFaction.nom, fromId, m.id) } : undefined}
                            >
                              <div style={{width:56,height:56,borderRadius:'50%',overflow:'hidden',background:'#0d2040',border:`2px solid ${MEMBER_TYPE_COLORS[m.type]||'#7a9ab8'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6rem'}}>
                                {m.photos && m.photos[0] ? <img src={m.photos[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (m.emoji||'👤')}
                              </div>
                              <span style={{fontSize:'.68rem',color:'#c8d8e8',textAlign:'center',lineHeight:1.2}}>{m.nom}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {(() => {
                const factionIles = linkedIles.filter(i => i.factions?.includes(rosterFaction.nom))
                if (factionIles.length === 0) return null
                return (
                  <>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:'.7rem',letterSpacing:'.14em',textTransform:'uppercase',color:'#00c8ff',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.5rem'}}>🏝️ Îles contrôlées <div style={{flex:1,height:1,background:'rgba(30,120,200,.2)'}} /></div>
                    <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                      {factionIles.map(i => (
                        <a key={i.id} href={`/iles?q=${encodeURIComponent(i.nom)}`} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',background:'#0d2040',border:'1px solid rgba(30,120,200,.2)',borderRadius:100,padding:'.4rem .85rem',color:'#c8d8e8',textDecoration:'none',fontSize:'.82rem'}}>
                          <span>{i.emoji||'🏝️'}</span>{i.nom}
                        </a>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
