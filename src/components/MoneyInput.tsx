'use client'

import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputStyle: React.CSSProperties
}

// Insère automatiquement des virgules tous les 3 chiffres (1000000 → 1,000,000) au fil de la
// frappe — sauf pour les valeurs non numériques comme "???" (prime inconnue), laissées telles
// quelles. Garde le curseur à sa position relative plutôt que de le renvoyer en bout de champ.
export function formatMoney(raw: string): string {
  if (/^\?+$/.test(raw.trim())) return raw
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return raw
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function MoneyInput({ value, onChange, placeholder, inputStyle }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target
    const prevLen = el.value.length
    const caret = el.selectionStart ?? prevLen
    const formatted = formatMoney(el.value)
    onChange(formatted)
    requestAnimationFrame(() => {
      if (!ref.current) return
      const diff = formatted.length - prevLen
      const newCaret = Math.max(0, caret + diff)
      ref.current.setSelectionRange(newCaret, newCaret)
    })
  }

  return <input ref={ref} style={inputStyle} value={value} onChange={handleChange} placeholder={placeholder} inputMode="numeric" />
}
