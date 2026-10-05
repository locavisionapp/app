import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

/**
 * Finger/stylus/mouse signature pad. Exposes `toDataURL()` (PNG with a
 * transparent background, cropped to the strokes) and `isEmpty()` via ref.
 */
export const SignaturePad = forwardRef(function SignaturePad({ label, onChange }, ref) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const bounds = useRef(null)
  const [empty, setEmpty] = useState(true)

  // Size the canvas to its CSS box at device resolution (sharp on phones).
  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  function point(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function extend(p) {
    const b = bounds.current || { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }
    bounds.current = { minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }
  }

  function down(e) {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
    extend(last.current)
  }

  function move(e) {
    if (!drawing.current) return
    const p = point(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    extend(p)
    if (empty) {
      setEmpty(false)
      onChange?.(false)
    }
  }

  function up() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    bounds.current = null
    setEmpty(true)
    onChange?.(true)
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    clear,
    toDataURL() {
      if (empty || !bounds.current) return null
      const canvas = canvasRef.current
      const ratio = window.devicePixelRatio || 1
      const pad = 8
      const { minX, minY, maxX, maxY } = bounds.current
      const sx = Math.max(0, (minX - pad) * ratio)
      const sy = Math.max(0, (minY - pad) * ratio)
      const sw = Math.min(canvas.width - sx, (maxX - minX + pad * 2) * ratio)
      const sh = Math.min(canvas.height - sy, (maxY - minY + pad * 2) * ratio)
      // Cropped and capped at 600px wide: a few KB, well under the API limit.
      const scale = Math.min(1, 600 / sw)
      const out = document.createElement('canvas')
      out.width = Math.max(1, Math.round(sw * scale))
      out.height = Math.max(1, Math.round(sh * scale))
      out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
      return out.toDataURL('image/png')
    },
  }))

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {!empty && (
          <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-slate-500 hover:text-status-bad">
            <Eraser size={12} /> Effacer
          </button>
        )}
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="h-36 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">Signez ici</span>
        )}
      </div>
    </div>
  )
})
