'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  file: File
  onCancel: () => void
  onCropped: (file: File) => void
}

const VIEW = 300
const OUTPUT = 640

export default function ImageCropper({ file, onCancel, onCropped }: Props) {
  const [imgUrl, setImgUrl] = useState('')
  const [natural, setNatural] = useState({ w: 0, h: 0 })
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

  const baseScale = natural.w && natural.h ? VIEW / Math.min(natural.w, natural.h) : 1
  const totalScale = baseScale * scale
  const dispW = natural.w * totalScale
  const dispH = natural.h * totalScale

  function clampPan(x: number, y: number) {
    const maxX = Math.max(0, (dispW - VIEW) / 2)
    const maxY = Math.max(0, (dispH - VIEW) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  useEffect(() => {
    setPan(p => clampPan(p.x, p.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, natural.w, natural.h])

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
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT
      canvas.height = OUTPUT
      const ctx = canvas.getContext('2d')
      if (!ctx) { setBusy(false); return }
      const imgLeft = VIEW / 2 - dispW / 2 + pan.x
      const imgTop = VIEW / 2 - dispH / 2 + pan.y
      const sx = -imgLeft / totalScale
      const sy = -imgTop / totalScale
      const sSize = VIEW / totalScale
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT)
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.8rem', color: '#f0c040', letterSpacing: '.08em', textTransform: 'uppercase' }}>🖼️ Recadrer la photo</div>
      <div
        style={{ width: VIEW, height: VIEW, overflow: 'hidden', position: 'relative', borderRadius: 12, border: '2px solid #d4a017', cursor: 'grab', touchAction: 'none', background: '#000' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
      >
        {imgUrl && (
          <img src={imgUrl} onLoad={handleImgLoad} draggable={false} alt="Aperçu à recadrer"
            style={{ position: 'absolute', left: VIEW / 2 - dispW / 2 + pan.x, top: VIEW / 2 - dispH / 2 + pan.y, width: dispW, height: dispH, userSelect: 'none', pointerEvents: 'none' }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', width: VIEW }}>
        <span style={{ color: '#7a9ab8', fontSize: '.9rem' }}>🔍</span>
        <input type="range" min={1} max={3} step={0.01} value={scale} onChange={e => setScale(parseFloat(e.target.value))} style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: '.65rem' }}>
        <button onClick={onCancel} style={{ background: 'rgba(0,200,255,.12)', color: '#00c8ff', border: '1px solid rgba(0,200,255,.3)', borderRadius: 10, padding: '.6rem 1.2rem', fontFamily: "'Cinzel',serif", fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Annuler</button>
        <button onClick={handleValidate} disabled={busy} style={{ background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#050d1a', border: 'none', borderRadius: 10, padding: '.6rem 1.2rem', fontFamily: "'Cinzel',serif", fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{busy ? '⏳...' : '✓ Valider le cadrage'}</button>
      </div>
    </div>
  )
}
