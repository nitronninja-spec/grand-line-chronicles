'use client'

import { useEffect, useRef, useState } from 'react'

interface LameOption { id: string; nom: string; rang?: string }

interface Props {
  lames: LameOption[]
  value: string // id de la lame sélectionnée, '' si aucune
  onChange: (id: string) => void
  placeholder?: string
  inputStyle: React.CSSProperties
}

// Calqué sur PersonnageSearchSelect, mais value/onChange portent l'id (clé étrangère
// fruits.lame_id) plutôt qu'un nom en texte libre — l'input affiche le nom pour la recherche
// et le rendu, la valeur stockée reste l'id.
export default function LameSearchSelect({ lames, value, onChange, placeholder, inputStyle }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = lames.find(l => l.id === value)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const displayValue = open ? query : (selected?.nom || '')
  const q = query.trim().toLowerCase()
  const matches = (q ? lames.filter(l => l.nom.toLowerCase().includes(q)) : lames).slice(0, 50)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={displayValue}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setQuery(''); setOpen(true) }}
        placeholder={placeholder}
      />
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + .3rem)', left: 0, right: 0, maxHeight: 220, overflowY: 'auto', background: '#0a1829', border: '1px solid rgba(30,180,255,.35)', borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,.6)', zIndex: 50 }}>
          <div onClick={() => { onChange(''); setQuery(''); setOpen(false) }}
            style={{ padding: '.55rem .8rem', color: '#4a6880', fontStyle: 'italic', fontSize: '.85rem', cursor: 'pointer', borderBottom: '1px solid rgba(30,120,200,.1)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >— Aucune —</div>
          {matches.length === 0 && <div style={{ padding: '.55rem .8rem', color: '#4a6880', fontSize: '.85rem' }}>Aucun résultat</div>}
          {matches.map(l => (
            <div key={l.id} onClick={() => { onChange(l.id); setQuery(''); setOpen(false) }}
              style={{ padding: '.55rem .8rem', color: '#c8d8e8', fontSize: '.88rem', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >{l.nom}{l.rang ? <span style={{ color: '#4a6880' }}> · {l.rang}</span> : null}</div>
          ))}
        </div>
      )}
    </div>
  )
}
