'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Stats {
  personnages: number
  fruits: number
  despas: number
  lames: number
  cristaux: number
  iles: number
  sessions: number
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ personnages: 0, fruits: 0, despas: 0, lames: 0, cristaux: 0, iles: 0, sessions: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      const [p, f, d, l, c, i, s] = await Promise.all([
        supabase.from('personnages').select('id', { count: 'exact', head: true }),
        supabase.from('fruits').select('id', { count: 'exact', head: true }),
        supabase.from('despas').select('id', { count: 'exact', head: true }),
        supabase.from('lames').select('id', { count: 'exact', head: true }),
        supabase.from('cristaux_primordiaux').select('id', { count: 'exact', head: true }),
        supabase.from('iles').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        personnages: p.count || 0,
        fruits: f.count || 0,
        despas: d.count || 0,
        lames: l.count || 0,
        cristaux: c.count || 0,
        iles: i.count || 0,
        sessions: s.count || 0,
      })
      setLoaded(true)
    }
    fetchStats()
  }, [])

  const categories = [
    { icon: '👥', name: 'Personnages', count: stats.personnages, href: '/personnages', color: '#00c8ff' },
    { icon: '🍎', name: 'Fruits du Démon', count: stats.fruits, href: '/fruits', color: '#d4a017' },
    { icon: '🦾', name: 'Despas', count: stats.despas, href: '/despas', color: '#00c8ff' },
    { icon: '⚔️', name: 'Lames', count: stats.lames, href: '/lames', color: '#7a9ab8' },
    { icon: '💎', name: 'Cristaux Primordiaux', count: stats.cristaux, href: '/cristaux', color: '#e03030' },
    { icon: '🏝️', name: 'Îles & Territoires', count: stats.iles, href: '/iles', color: '#4040ff' },
    { icon: '⚔️', name: 'Factions', count: 0, href: '/factions', color: '#e03030' },
    { icon: '💥', name: 'Techniques', count: 0, href: '/techniques', color: '#80e080' },
    { icon: '📜', name: 'Campagne', count: stats.sessions, href: '/campagne', color: '#ff8c40' },
    { icon: '📖', name: 'Lore & Encyclopédie', count: 0, href: '/lore', color: '#c040ff' },
  ]

  return (
    <main style={{
      minHeight: '100vh',
      background: '#050d1a',
      color: '#e8eef5',
      fontFamily: "'Crimson Pro', Georgia, serif",
    }}>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60, background: 'rgba(5,13,26,.93)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(30,120,200,.2)',
        display: 'flex', alignItems: 'center',
        padding: '0 2rem', gap: '1rem',
      }}>
        <div style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: '1rem', fontWeight: 900,
          background: 'linear-gradient(135deg, #f0c040, #d4a017)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'flex', alignItems: 'center', gap: '.5rem',
        }}>
          <span style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #d4a017, #f0c040)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1rem',
          }}>☠</span>
          Grand Line Chronicles
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '.5rem', overflowX: 'auto' }}>
          {[
            ['Personnages', '/personnages'],
            ['Fruits', '/fruits'],
            ['Despas', '/despas'],
            ['Lames', '/lames'],
            ['Cristaux', '/cristaux'],
            ['Îles', '/iles'],
            ['Factions', '/factions'],
            ['Campagne', '/campagne'],
            ['Lore', '/lore'],
            ['Dashboard', '/dashboard'],
          ].map(([label, href]) => (
            <a key={href} href={href} style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '.62rem', letterSpacing: '.07em',
              textTransform: 'uppercase', color: '#7a9ab8',
              textDecoration: 'none', padding: '.38rem .65rem',
              borderRadius: 6, whiteSpace: 'nowrap',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f0c040'; (e.target as HTMLElement).style.background = 'rgba(212,160,23,.15)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#7a9ab8'; (e.target as HTMLElement).style.background = 'none' }}
            >{label}</a>
          ))}
        </div>
        <a href="/dashboard" style={{
          background: 'linear-gradient(135deg, #d4a017, #b8860b)',
          color: '#050d1a', border: 'none', borderRadius: 8,
          padding: '.38rem .85rem', fontFamily: "'Cinzel', serif",
          fontSize: '.62rem', fontWeight: 700, letterSpacing: '.07em',
          textDecoration: 'none', cursor: 'pointer',
        }}>⚓ MJ</a>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '6rem 2rem 4rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 40%, rgba(0,60,120,.3), transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(0,30,80,.4), transparent 55%)',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 800 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)',
            borderRadius: 100, padding: '.3rem .9rem', marginBottom: '1.5rem',
            fontFamily: "'Cinzel', serif", fontSize: '.6rem',
            letterSpacing: '.15em', color: '#f0c040', textTransform: 'uppercase',
            animation: loaded ? 'fadeUp .8s ease both' : 'none',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a017' }} />
            Univers de Jeu de Rôle
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 'clamp(2.2rem, 6vw, 5rem)',
            fontWeight: 900, lineHeight: 1.08, marginBottom: '1rem',
          }}>
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #fff, #f0c040 40%, #d4a017)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Grand Line<br />Chronicles</span>
            <span style={{
              display: 'block', fontSize: '.42em', letterSpacing: '.35em',
              background: 'linear-gradient(90deg, #00c8ff, #0080ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginTop: '.4rem',
            }}>L'Âge des Pirates</span>
          </h1>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '1.25rem auto', maxWidth: 260 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a017, transparent)' }} />
            <span style={{ color: '#d4a017' }}>⚓</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a017, transparent)' }} />
          </div>

          <p style={{
            fontSize: '1.1rem', fontStyle: 'italic', color: '#7a9ab8',
            maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7,
          }}>
            La grande banque de données de votre univers pirate. Chaque île, chaque fruit du démon, chaque pirate légendaire — consigné pour l'éternité.
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/personnages" style={{
              background: 'linear-gradient(135deg, #d4a017, #b8860b)',
              color: '#050d1a', border: 'none', borderRadius: 10,
              padding: '.9rem 1.8rem', fontFamily: "'Cinzel', serif",
              fontSize: '.75rem', fontWeight: 700, letterSpacing: '.1em',
              textTransform: 'uppercase', textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(212,160,23,.4)',
              display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            }}>👥 Voir les Personnages</a>
            <a href="/dashboard" style={{
              background: 'transparent', color: '#00c8ff',
              border: '1px solid rgba(0,200,255,.4)', borderRadius: 10,
              padding: '.9rem 1.8rem', fontFamily: "'Cinzel', serif",
              fontSize: '.75rem', fontWeight: 600, letterSpacing: '.1em',
              textTransform: 'uppercase', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            }}>⚓ Espace MJ</a>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', gap: '2.5rem', justifyContent: 'center',
          flexWrap: 'wrap', marginTop: '3rem',
        }}>
          {[
            { n: stats.personnages, l: 'Personnages' },
            { n: stats.iles, l: 'Îles' },
            { n: stats.fruits, l: 'Fruits' },
            { n: stats.sessions, l: 'Sessions' },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <span style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '2rem', fontWeight: 900, display: 'block', lineHeight: 1,
                background: 'linear-gradient(135deg, #f0c040, #d4a017)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{n}</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: '.6rem',
                letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#7a9ab8', display: 'block', marginTop: '.25rem',
              }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '3rem 2rem 5rem', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: '.65rem',
            letterSpacing: '.22em', textTransform: 'uppercase',
            color: '#00c8ff', marginBottom: '.6rem',
          }}>✦ Navigation ✦</div>
          <div style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 700,
            background: 'linear-gradient(135deg, #fff, #f0c040)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '.75rem',
          }}>Naviguer dans l'Univers</div>
          <div style={{ width: 70, height: 2, background: 'linear-gradient(90deg, transparent, #d4a017, transparent)', margin: '0 auto' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: '.9rem',
        }}>
          {categories.map((cat) => (
            <a key={cat.href} href={cat.href} style={{
              background: '#0d2040', border: '1px solid rgba(30,120,200,.2)',
              borderRadius: 14, padding: '1.5rem 1.25rem',
              textDecoration: 'none', display: 'block',
              transition: 'all .3s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = cat.color
              el.style.transform = 'translateY(-5px) scale(1.02)'
              el.style.boxShadow = `0 18px 36px rgba(0,0,0,.4), 0 0 0 1px ${cat.color}`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(30,120,200,.2)'
              el.style.transform = 'none'
              el.style.boxShadow = 'none'
            }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{cat.icon}</div>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: '.82rem',
                fontWeight: 700, color: '#e8eef5', marginBottom: '.2rem',
              }}>{cat.name}</div>
              <div style={{ fontSize: '.78rem', color: '#7a9ab8' }}>
                {cat.count} {cat.count === 1 ? 'entrée' : 'entrées'}
              </div>
            </a>
          ))}
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #d4a017; border-radius: 3px; }
      `}</style>
    </main>
  )
}
