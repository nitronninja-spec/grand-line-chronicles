'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  file: File
  onCancel: () => void
  onCropped: (file: File) => void
}

type AspectKey = 'portrait' | 'carre' | 'paysage'
const ASPECTS: Record<AspectKey, { w: number; h: number; label: string; icon: string }> = {
  portrait: { w: 3, h: 4, label: 'Portrait', icon: '🪪' },
  carre: { w: 1, h: 1, label: 'Carré', icon: '⬛' },
  paysage: { w: 4, h: 3, label: 'Paysage', icon: '🖼️' },
}
const VIEW_MAX = 320
const OUTPUT_MAX = 900

function viewDims(aspect: AspectKey) {
  const { w, h } = ASPECTS[aspect]
  const scale = VIEW_MAX / Math.max(w, h)
  return { vw: Math.round(w * scale), vh: Math.round(h * scale) }
}

export default function ImageCropper({ file, onCancel, onCropped }: Props) {
  const [imgUrl, setImgUrl] = useState('')
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [aspect, setAspect] = useState<AspectKey>('portrait')
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const { vw, vh } = viewDims(aspect)
  const baseScale = natural.w && natural.h ? Math.max(vw / natural.w, vh / natural.h) : 1
  const totalScale = baseScale * scale
  const dispW = natural.w * totalScale
  const dispH = natural.h * totalScale

  function clampPan(x: number, y: number) {
    const maxX = Math.max(0, (dispW - vw) / 2)
    const maxY = Math.max(0, (dispH - vh) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  useEffect(() => {
    setPan(p => clampPan(p.x, p.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, aspect, natural.w, natural.h])

  function resetView() {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  function changeAspect(a: AspectKey) {
    setAspect(a)
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy))
  }
  function onPointerUp() { dragRef.current = null }

  function handleValidate() {
    setBusy(true)
    const img = new Image()
    img.onload = () => {
      const outScale = OUTPUT_MAX / Math.max(vw, vh)
      const outW = Math.round(vw * outScale)
      const outH = Math.round(vh * outScale)
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) { setBusy(false); return }
      const imgLeft = vw / 2 - dispW / 2 + pan.x
      const imgTop = vh / 2 - dispH / 2 + pan.y
      const sx = -imgLeft / totalScale
      const sy = -imgTop / totalScale
      const sW = vw / totalScale
      const sH = vh / totalScale
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sW, sH, 0, 0, outW, outH)
      canvas.toBlob(blob => {
        setBusy(false)
        if (!blob) return
        const cropped = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
        onCropped(cropped)
      }, 'image/jpeg', 0.92)
    }
    img.src = imgUrl
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '.9rem', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.8rem', color: '#f0c040', letterSpacing: '.08em', textTransform: 'uppercase' }}>🖼️ Recadrer la photo</div>

      <div style={{ display: 'flex', gap: '.4rem' }}>
        {(Object.keys(ASPECTS) as AspectKey[]).map(a => (
          <button key={a} onClick={() => changeAspect(a)} style={{
            background: aspect === a ? 'rgba(212,160,23,.18)' : 'rgba(13,32,64,.9)',
            border: `1px solid ${aspect === a ? '#d4a017' : 'rgba(30,120,200,.3)'}`,
            borderRadius: 100, padding: '.35rem .8rem', fontFamily: "'Cinzel',serif", fontSize: '.62rem',
            letterSpacing: '.06em', textTransform: 'uppercase', color: aspect === a ? '#f0c040' : '#7a9ab8', cursor: 'pointer'
          }}>{ASPECTS[a].icon} {ASPECTS[a].label}</button>
        ))}
      </div>

      <div
        style={{ width: vw, height: vh, overflow: 'hidden', position: 'relative', borderRadius: 12, border: '2px solid #d4a017', cursor: 'grab', touchAction: 'none', background: '#000' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        onDoubleClick={resetView}
      >
        {imgUrl && (
          <img src={imgUrl} onLoad={handleImgLoad} draggable={false} alt="Aperçu à recadrer"
            style={{ position: 'absolute', left: vw / 2 - dispW / 2 + pan.x, top: vh / 2 - dispH / 2 + pan.y, width: dispW, height: dispH, userSelect: 'none', pointerEvents: 'none' }} />
        )}
        {/* Grille des tiers */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[1, 2].map(i => <div key={`v${i}`} style={{ position: 'absolute', left: `${(i / 3) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.35)' }} />)}
          {[1, 2].map(i => <div key={`h${i}`} style={{ position: 'absolute', top: `${(i / 3) * 100}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.35)' }} />)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', width: vw }}>
        <span style={{ color: '#7a9ab8', fontSize: '.9rem' }}>🔍</span>
        <input type="range" min={1} max={3} step={0.01} value={scale} onChange={e => setScale(parseFloat(e.target.value))} style={{ flex: 1 }} />
        <button onClick={resetView} title="Réinitialiser" style={{ background: 'none', border: '1px solid rgba(30,120,200,.3)', borderRadius: '50%', width: 28, height: 28, color: '#7a9ab8', cursor: 'pointer', fontSize: '.75rem' }}>↺</button>
      </div>
      <div style={{ fontSize: '.62rem', color: '#4a6880', fontStyle: 'italic' }}>Glisse pour déplacer · double-clic pour réinitialiser</div>

      <div style={{ display: 'flex', gap: '.65rem' }}>
        <button onClick={onCancel} style={{ background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.6rem 1.2rem', fontFamily: "'Cinzel',serif", fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Annuler</button>
        <button onClick={handleValidate} disabled={busy} style={{ background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.6rem 1.2rem', fontFamily: "'Cinzel',serif", fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{busy ? '⏳...' : '✓ Valider le cadrage'}</button>
      </div>
    </div>
  )
}
