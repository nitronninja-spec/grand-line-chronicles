'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  personnages: number
  fruits: number
  iles: number
  factions: number
  campagne: number
  lore: number
}

interface RecentItem {
  id: string
  nom?: string
  name?: string
  titre?: string
  type?: string
  created_at: string
}

const SECTIONS = [
  { key: 'personnages', label: 'Personnages', icon: '⚔️', color: '#00c8ff', href: '/personnages', desc: 'Gérer les PJs et PNJs' },
  { key: 'fruits', label: 'Fruits du Démon', icon: '🍎', color: '#d4a017', href: '/fruits', desc: 'Cataloguer les pouvoirs' },
  { key: 'iles', label: 'Îles', icon: '🏝️', color: '#40d060', href: '/iles', desc: 'Cartographier la Grand Line' },
  { key: 'factions', label: 'Factions', icon: '🏴‍☠️', color: '#ff8c40', href: '/factions', desc: 'Gérer les alliances' },
  { key: 'campagne', label: 'Campagne', icon: '📜', color: '#a060ff', href: '/campagne', desc: 'Suivre les aventures' },
  { key: 'lore', label: 'Lore', icon: '📖', color: '#ff6090', href: '/lore', desc: 'Encyclopédie du monde' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ personnages: 0, fruits: 0, iles: 0, factions: 0, campagne: 0, lore: 0 })
  const [recents, setRecents] = useState<{ section: string; items: RecentItem[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    fetchAll()
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function fetchAll() {
    setLoading(true)
    const tables = ['personnages', 'fruits', 'iles', 'factions', 'campagne', 'lore']
    const results = await Promise.all(
      tables.map(t => supabase.from(t).select('*', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(3))
    )
    const newStats: Stats = { personnages: 0, fruits: 0, iles: 0, factions: 0, campagne: 0, lore: 0 }
    const newRecents: { section: string; items: RecentItem[] }[] = []
    results.forEach((r, i) => {
      const key = tables[i] as keyof Stats
      newStats[key] = r.count || r.data?.length || 0
      if (r.data && r.data.length > 0) {
        newRecents.push({ section: tables[i], items: r.data })
      }
    })
    setStats(newStats)
    setRecents(newRecents)
    setLoading(false)
  }

  function getItemName(item: RecentItem): string {
    return item.nom || item.name || item.titre || '—'
  }

  const totalEntries = Object.values(stats).reduce((a, b) => a + b, 0)
  const navLinks = [['Accueil', '/'], ['Personnages', '/personnages'], ['Fruits', '/fruits'], ['Îles', '/iles'], ['Factions', '/factions'], ['Campagne', '/campagne'], ['Lore', '/lore'], ['Dashboard', '/dashboard']]

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e8eef5', fontFamily: "'Crimson Pro', Georgia, serif", paddingTop: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d4a017; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .card-section:hover { transform: translateY(-4px) !important; }
        .quick-link:hover { background: rgba(212,160,23,.12) !important; border-color: rgba(212,160,23,.4) !important; }
        .recent-item:hover { background: rgba(30,120,200,.12) !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 60, background: 'rgba(5,13,26,.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,160,23,.15)', display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '1rem' }}>
        <a href="/" style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f0c040, #d4a017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#d4a017,#f0c040)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050d1a' }}>☠</span>
          Grand Line
        </a>
        <div style={{ flex: 1, display: 'flex', gap: '.3rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {navLinks.map(([l, h]) => (
            <a key={h} href={h} style={{ fontFamily: "'Cinzel',serif", fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: h === '/dashboard' ? '#f0c040' : '#7a9ab8', textDecoration: 'none', padding: '.38rem .6rem', borderRadius: 6, whiteSpace: 'nowrap', background: h === '/dashboard' ? 'rgba(212,160,23,.15)' : 'none' }}>{l}</a>
          ))}
        </div>
        {/* Horloge */}
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.65rem', letterSpacing: '.08em', color: '#d4a017', whiteSpace: 'nowrap' }}>
          {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </nav>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem', animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.58rem', letterSpacing: '.14em', textTransform: 'uppercase', color: '#d4a017', marginBottom: '.5rem' }}>
            ⚓ Quartier Général du Maître du Jeu
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, background: 'linear-gradient(135deg, #fff 30%, #f0c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
              Dashboard MJ
            </h1>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.62rem', letterSpacing: '.09em', textTransform: 'uppercase', color: '#4a6880' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Stat globale */}
        <div style={{ background: 'linear-gradient(135deg, rgba(212,160,23,.1), rgba(212,160,23,.03))', border: '1px solid rgba(212,160,23,.25)', borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', animation: 'fadeUp .5s .05s ease both' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.55rem', letterSpacing: '.13em', textTransform: 'uppercase', color: '#d4a017', marginBottom: '.3rem' }}>Total des entrées</div>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '3rem', color: '#f0c040', lineHeight: 1 }}>
              {loading ? '…' : totalEntries}
            </div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(212,160,23,.2)' }} />
          <div style={{ flex: 1, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <div key={s.key}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.52rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '.2rem' }}>{s.label}</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.4rem', color: s.color, fontWeight: 700 }}>
                  {loading ? <span style={{ animation: 'shimmer 1s infinite', display: 'inline-block' }}>—</span> : stats[s.key as keyof Stats]}
                </div>
              </div>
            ))}
          </div>
          <button onClick={fetchAll} style={{ background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.25)', borderRadius: 10, padding: '.5rem .9rem', color: '#d4a017', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            🔄 Actualiser
          </button>
        </div>

        {/* Grille accès rapide */}
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.58rem', letterSpacing: '.13em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '1rem', animation: 'fadeUp .5s .1s ease both' }}>
          Accès rapide
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '.85rem', marginBottom: '2.5rem' }}>
          {SECTIONS.map((s, i) => (
            <a key={s.key} href={s.href} className="card-section" style={{
              background: `linear-gradient(135deg, rgba(13,32,64,.9), #050d1a)`,
              border: `1px solid ${s.color}22`,
              borderRadius: 14,
              padding: '1.25rem',
              textDecoration: 'none',
              display: 'block',
              transition: 'all .25s',
              animation: `fadeUp .45s ${.12 + i * .06}s ease both`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Accent top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: .6 }} />
              {/* Glow */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: s.color, opacity: .04, filter: 'blur(20px)' }} />

              <div style={{ fontSize: '1.8rem', marginBottom: '.75rem' }}>{s.icon}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', color: '#e8eef5', marginBottom: '.3rem' }}>{s.label}</div>
              <div style={{ fontSize: '.8rem', color: '#4a6880', fontStyle: 'italic', marginBottom: '.85rem', lineHeight: 1.4 }}>{s.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: s.color, fontWeight: 700 }}>
                  {loading ? '—' : stats[s.key as keyof Stats]}
                  <span style={{ fontSize: '.55rem', color: '#4a6880', marginLeft: '.3rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>entrées</span>
                </div>
                <div style={{ color: s.color, fontSize: '.9rem', opacity: .7 }}>→</div>
              </div>
            </a>
          ))}
        </div>

        {/* Ajouts récents */}
        {recents.length > 0 && (
          <div style={{ animation: 'fadeUp .5s .5s ease both' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.58rem', letterSpacing: '.13em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '1rem' }}>
              Ajouts récents
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.85rem' }}>
              {recents.map(({ section, items }) => {
                const sec = SECTIONS.find(s => s.key === section)!
                return (
                  <div key={section} style={{ background: '#0a1829', border: `1px solid ${sec.color}18`, borderRadius: 14, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '.85rem 1.1rem', borderBottom: `1px solid ${sec.color}18`, display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontSize: '1rem' }}>{sec.icon}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '.6rem', letterSpacing: '.09em', textTransform: 'uppercase', color: sec.color }}>{sec.label}</span>
                      <a href={sec.href} style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '.52rem', letterSpacing: '.08em', textTransform: 'uppercase', color: '#4a6880', textDecoration: 'none' }}>Voir tout →</a>
                    </div>
                    {/* Items */}
                    {items.map(item => (
                      <div key={item.id} className="recent-item" style={{ padding: '.7rem 1.1rem', borderBottom: '1px solid rgba(30,120,200,.06)', display: 'flex', alignItems: 'center', gap: '.75rem', transition: 'background .2s', cursor: 'default' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sec.color, opacity: .6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.68rem', color: '#c8d8e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getItemName(item)}
                          </div>
                          {item.type && <div style={{ fontSize: '.72rem', color: '#4a6880', fontStyle: 'italic' }}>{item.type}</div>}
                        </div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.52rem', color: '#2a3850', whiteSpace: 'nowrap' }}>
                          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liens rapides du bas */}
        <div style={{ marginTop: '2.5rem', animation: 'fadeUp .5s .65s ease both' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.58rem', letterSpacing: '.13em', textTransform: 'uppercase', color: '#4a6880', marginBottom: '1rem' }}>
            Actions rapides
          </div>
          <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <a key={s.key} href={s.href} className="quick-link" style={{
                background: 'rgba(10,24,41,.8)',
                border: '1px solid rgba(30,120,200,.15)',
                borderRadius: 100,
                padding: '.45rem 1rem',
                textDecoration: 'none',
                fontFamily: "'Cinzel', serif",
                fontSize: '.6rem',
                letterSpacing: '.07em',
                textTransform: 'uppercase',
                color: '#7a9ab8',
                display: 'flex',
                alignItems: 'center',
                gap: '.4rem',
                transition: 'all .2s',
              }}>
                <span>{s.icon}</span> + {s.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
