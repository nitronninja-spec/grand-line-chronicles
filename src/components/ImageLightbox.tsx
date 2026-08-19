'use client'

import { useEffect } from 'react'

interface Props {
  images: string[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

// Visionneuse plein écran pour agrandir une image d'une galerie (fruits, personnages...) —
// flèches gauche/droite pour naviguer, Échap ou clic hors image pour fermer.
export default function ImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndexChange])

  if (images.length === 0) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.94)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', color: '#e8eef5', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', fontSize: '1.1rem', zIndex: 2 }}>✕</button>

      {images.length > 1 && (
        <button onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
          style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', color: '#e8eef5', borderRadius: '50%', width: 46, height: 46, cursor: 'pointer', fontSize: '1.3rem', zIndex: 2 }}>‹</button>
      )}

      <img src={images[index]} alt="" style={{ maxWidth: '100%', maxHeight: '86vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 30px 80px rgba(0,0,0,.7)' }} onClick={e => e.stopPropagation()} />

      {images.length > 1 && (
        <button onClick={() => onIndexChange((index + 1) % images.length)}
          style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', color: '#e8eef5', borderRadius: '50%', width: 46, height: 46, cursor: 'pointer', fontSize: '1.3rem', zIndex: 2 }}>›</button>
      )}

      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '.4rem' }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => onIndexChange(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === index ? '#d4a017' : 'rgba(255,255,255,.3)', padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  )
}
