'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ResultItem {
  id: string
  name: string
  href: string
}
interface ResultGroup {
  label: string
  icon: string
  items: ResultItem[]
}

const SOURCES: { table: string; col: string; icon: string; label: string; href: (id: string, name: string) => string }[] = [
  { table: 'personnages', col: 'nom', icon: '👤', label: 'Personnages', href: (id) => `/personnages?open=${id}` },
  { table: 'fruits', col: 'nom', icon: '🍎', label: 'Fruits', href: (_id, name) => `/fruits?q=${encodeURIComponent(name)}` },
  { table: 'despas', col: 'nom', icon: '🦾', label: 'Despas', href: (_id, name) => `/despas?q=${encodeURIComponent(name)}` },
  { table: 'lames', col: 'nom', icon: '⚔️', label: 'Lames', href: (_id, name) => `/lames?q=${encodeURIComponent(name)}` },
  { table: 'cristaux_primordiaux', col: 'nom', icon: '💎', label: 'Cristaux', href: (_id, name) => `/cristaux?q=${encodeURIComponent(name)}` },
  { table: 'iles', col: 'nom', icon: '🏝️', label: 'Îles', href: (_id, name) => `/iles?q=${encodeURIComponent(name)}` },
  { table: 'factions', col: 'nom', icon: '🏴‍☠️', label: 'Factions', href: (_id, name) => `/factions?q=${encodeURIComponent(name)}` },
  { table: 'sessions', col: 'titre', icon: '📜', label: 'Journaux', href: (_id, name) => `/journaux?q=${encodeURIComponent(name)}` },
  { table: 'lore', col: 'titre', icon: '📖', label: 'Lore', href: (_id, name) => `/lore?q=${encodeURIComponent(name)}` },
]

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<ResultGroup[]>([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setGroups([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      const results = await Promise.all(SOURCES.map(async src => {
        const { data } = await supabase.from(src.table).select('*').ilike(src.col, `%${query.trim()}%`).limit(5)
        const items: ResultItem[] = (data || [])
          .filter((row: Record<string, unknown>) => row[src.col])
          .map((row: Record<string, unknown>) => ({
            id: row.id as string,
            name: row[src.col] as string,
            href: src.href(row.id as string, row[src.col] as string),
          }))
        return { label: src.label, icon: src.icon, items }
      }))
      setGroups(results.filter(g => g.items.length > 0))
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div ref={boxRef} style={{ position: 'relative', width: 220, flexShrink: 0 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '.6rem', top: '50%', transform: 'translateY(-50%)', color: '#4a6880', fontSize: '.8rem', pointerEvents: 'none' }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher partout..."
          style={{
            width: '100%', background: '#0d2040', border: '1px solid rgba(30,120,200,.25)', borderRadius: 100,
            padding: '.4rem .7rem .4rem 1.9rem', color: '#e8eef5', fontFamily: "'Crimson Pro', serif",
            fontSize: '.8rem', outline: 'none',
          }}
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + .5rem)', right: 0, width: 320, maxHeight: 420, overflowY: 'auto',
          background: '#0a1829', border: '1px solid rgba(30,180,255,.35)', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,.6)', zIndex: 300,
        }}>
          {loading && <div style={{ padding: '1rem', color: '#4a6880', fontSize: '.78rem', fontStyle: 'italic', textAlign: 'center' }}>Recherche...</div>}
          {!loading && groups.length === 0 && <div style={{ padding: '1rem', color: '#4a6880', fontSize: '.78rem', fontStyle: 'italic', textAlign: 'center' }}>Aucun résultat</div>}
          {!loading && groups.map(g => (
            <div key={g.label}>
              <div style={{ padding: '.5rem .9rem .3rem', fontFamily: "'Cinzel',serif", fontSize: '.55rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#4a6880' }}>{g.icon} {g.label}</div>
              {g.items.map(item => (
                <a key={item.id} href={item.href} style={{
                  display: 'block', padding: '.5rem .9rem', color: '#c8d8e8', textDecoration: 'none', fontSize: '.85rem',
                  fontFamily: "'Crimson Pro', serif", borderBottom: '1px solid rgba(30,120,200,.06)',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >{item.name}</a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
