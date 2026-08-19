'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  personnages: { id: string; nom: string }[]
  value: string
  onChange: (nom: string) => void
  placeholder?: string
  inputStyle: React.CSSProperties
}

export default function PersonnageSearchSelect({ personnages, value, onChange, placeholder, inputStyle }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = value.trim().toLowerCase()
  const matches = (q ? personnages.filter(p => p.nom.toLowerCase().includes(q)) : personnages).slice(0, 50)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + .3rem)', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', background: '#0a1829', border: '1px solid rgba(30,180,255,.35)', borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,.6)', zIndex: 50 }}>
          <div onClick={() => { onChange(''); setOpen(false) }}
            style={{ padding: '.55rem .8rem', color: '#4a6880', fontStyle: 'italic', fontSize: '.85rem', cursor: 'pointer', borderBottom: '1px solid rgba(30,120,200,.1)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >— Non attribué —</div>
          {matches.length === 0 && <div style={{ padding: '.55rem .8rem', color: '#4a6880', fontSize: '.85rem' }}>Aucun résultat</div>}
          {matches.map(p => (
            <div key={p.id} onClick={() => { onChange(p.nom); setOpen(false) }}
              style={{ padding: '.55rem .8rem', color: '#c8d8e8', fontSize: '.88rem', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >{p.nom}</div>
          ))}
        </div>
      )}
    </div>
  )
}
